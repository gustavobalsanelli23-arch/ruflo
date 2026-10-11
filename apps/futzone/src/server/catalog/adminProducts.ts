import 'server-only';
import type { Product, ProductInput, ProductStatus, Size } from '@/types/catalog';
import { ALL_SIZES } from '@/types/catalog';
import { teams } from '@/data/teams';
import { categories } from '@/data/categories';
import { getPool, withTransaction } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';
import { loadProducts, toAdminProduct, sellable } from './store';

/**
 * Edição de produtos pelo painel, gravada no banco. Todo campo alterado à mão
 * entra em `manual_fields` e a sincronização com o fornecedor deixa de mexer nele.
 * Preço editado vira preço manual (a tabela não o sobrescreve).
 */

export class ProductInputError extends Error {}

/** Campos que o admin pode editar e que a sincronização respeita depois. */
const TRACKED: (keyof Product)[] = ['name', 'description', 'price', 'compareAtPrice', 'images', 'category', 'season', 'teamId', 'tags', 'details', 'gender', 'slug'];

const STATUSES: ProductStatus[] = ['published', 'draft', 'inactive'];

function validate(input: ProductInput): ProductInput {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 160) throw new ProductInputError('Nome inválido.');
  if (!/^[a-z0-9-]{1,100}$/.test(input.slug ?? '')) throw new ProductInputError('Endereço (slug) inválido.');
  if (!teams.some((t) => t.id === input.teamId)) throw new ProductInputError('Time inválido.');
  if (!categories.some((c) => c.id === input.category)) throw new ProductInputError('Categoria inválida.');
  if (!Number.isInteger(input.price) || input.price <= 0 || input.price > 10_000_000) throw new ProductInputError('Preço inválido.');
  if (input.compareAtPrice !== undefined && (!Number.isInteger(input.compareAtPrice) || input.compareAtPrice <= input.price)) throw new ProductInputError('Preço anterior inválido.');
  if (!Array.isArray(input.sizes) || !input.sizes.length || input.sizes.some((s) => !ALL_SIZES.includes(s))) throw new ProductInputError('Tamanhos inválidos.');
  if (!STATUSES.includes(input.status)) throw new ProductInputError('Situação inválida.');
  if (!Array.isArray(input.images) || input.images.length > 12) throw new ProductInputError('Imagens inválidas.');
  for (const img of input.images) {
    if (typeof img?.src !== 'string' || !(img.src.startsWith('/') || img.src.startsWith('https://') || img.src.startsWith('data:image/'))) throw new ProductInputError('Imagem inválida.');
    if (img.src.length > 2_000_000) throw new ProductInputError('Imagem grande demais.');
  }
  for (const s of input.sizes) {
    const q = input.stock?.[s];
    if (q !== undefined && (!Number.isInteger(q) || q < 0 || q > 9999)) throw new ProductInputError('Estoque inválido.');
  }
  // Só os campos do produto: nada além disso é gravado (nem exposto depois na loja).
  return {
    id: input.id,
    name,
    slug: input.slug,
    teamId: input.teamId,
    category: input.category,
    season: typeof input.season === 'string' ? input.season.trim().slice(0, 20) : '',
    gender: (['masculino', 'feminino', 'infantil', 'unissex'] as const).includes(input.gender) ? input.gender : 'masculino',
    description: typeof input.description === 'string' ? input.description.slice(0, 2000) : '',
    details: Array.isArray(input.details) ? input.details.filter((d) => typeof d === 'string').slice(0, 12).map((d) => d.slice(0, 200)) : [],
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    sizes: input.sizes,
    stock: input.stock ?? {},
    images: input.images.map((img) => ({ src: img.src, alt: typeof img.alt === 'string' ? img.alt.slice(0, 200) : '' })),
    palette: { primary: String(input.palette?.primary ?? '#1f6bff').slice(0, 20), secondary: String(input.palette?.secondary ?? '#ffffff').slice(0, 20) },
    status: input.status,
    tags: Array.isArray(input.tags) ? input.tags.filter((t) => ['mais-vendido', 'lancamento', 'popular'].includes(t)) : [],
  };
}

export async function listAdminProducts() {
  await ensureDatabase();
  return (await loadProducts(getPool())).map(toAdminProduct);
}

export async function saveAdminProduct(raw: ProductInput) {
  await ensureDatabase();
  const input = validate(raw);
  return withTransaction(async (db) => {
    const slugTaken = await db.query('SELECT id FROM products WHERE slug = $1 AND id <> $2', [input.slug, input.id ?? '']);
    if (slugTaken.rowCount) throw new ProductInputError('Já existe um produto com este endereço (slug).');

    if (!input.id) {
      const id = `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const product: Product = { ...input, id, createdAt: new Date().toISOString().slice(0, 10), salesCount: 0 };
      await db.query(`INSERT INTO products (id, slug, data, price_source, manual_fields, supplier_active) VALUES ($1, $2, $3, 'manual', $4, false)`, [
        id,
        product.slug,
        JSON.stringify(product),
        TRACKED,
      ]);
      for (const s of product.sizes) {
        const q = input.stock?.[s] ?? 0;
        await db.query(`INSERT INTO product_stock (product_id, size, supplier_available, cap, committed, manual_cap) VALUES ($1, $2, true, $3, 0, true)`, [id, s, q]);
      }
      return id;
    }

    const cur = await loadProducts(db, { ids: [input.id] });
    const existing = cur[0];
    if (!existing) throw new ProductInputError('Produto não encontrado.');
    await db.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [input.id]);
    const before = existing.row.data;
    const changed = TRACKED.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(input[k as keyof ProductInput]));
    const product: Product = { ...before, ...input, id: before.id, createdAt: before.createdAt, salesCount: before.salesCount, stock: {} };
    await db.query(
      `UPDATE products SET data = $2, slug = $3,
         manual_fields = array(SELECT DISTINCT unnest(manual_fields || $4::text[])),
         price_source = CASE WHEN $5 THEN 'manual' ELSE price_source END,
         updated_at = now()
       WHERE id = $1`,
      [input.id, JSON.stringify(product), product.slug, changed, changed.includes('price')],
    );
    // Quantidade digitada diferente do vendável atual vira o novo limite do tamanho.
    for (const s of product.sizes) {
      const q = input.stock?.[s];
      if (q === undefined || q === sellable(existing.stock[s])) continue;
      await setStockRow(db, input.id, s, q, !existing.row.supplier_id);
    }
    return input.id;
  });
}

async function setStockRow(db: { query: (q: string, p: unknown[]) => Promise<unknown> }, id: string, size: Size, quantity: number, ownProduct: boolean) {
  // O vendável passa a ser exatamente `quantity` (novo limite, contagem zerada);
  // a disponibilidade no fornecedor continua mandando.
  await db.query(
    `INSERT INTO product_stock (product_id, size, supplier_available, cap, committed, manual_cap) VALUES ($1, $2, $4, $3, 0, true)
     ON CONFLICT (product_id, size) DO UPDATE SET cap = $3, committed = 0, manual_cap = true, updated_at = now()`,
    [id, size, quantity, ownProduct],
  );
}

export async function setAdminStock(id: string, size: Size, quantity: number) {
  if (!ALL_SIZES.includes(size) || !Number.isInteger(quantity) || quantity < 0 || quantity > 9999) throw new ProductInputError('Estoque inválido.');
  await ensureDatabase();
  await withTransaction(async (db) => {
    const r = await db.query<{ supplier_id: string | null }>('SELECT supplier_id FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (!r.rowCount) throw new ProductInputError('Produto não encontrado.');
    await setStockRow(db, id, size, quantity, !r.rows[0].supplier_id);
  });
}

export async function setAdminStatus(id: string, status: ProductStatus) {
  if (!STATUSES.includes(status)) throw new ProductInputError('Situação inválida.');
  await ensureDatabase();
  await withTransaction(async (db) => {
    const r = await db.query<{ review_state: string }>('SELECT review_state FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (!r.rowCount) throw new ProductInputError('Produto não encontrado.');
    if (r.rows[0].review_state === 'pending' && status === 'published') throw new ProductInputError('Aprove o produto em Integração com fornecedor antes de publicar.');
    await db.query(
      `UPDATE products SET data = jsonb_set(data, '{status}', to_jsonb($2::text)), archived = false,
         manual_fields = array(SELECT DISTINCT unnest(manual_fields || ARRAY['status'])), updated_at = now() WHERE id = $1`,
      [id, status],
    );
  });
}

/**
 * "Excluir" no painel. Produto com pedido ou vindo do fornecedor é arquivado (sai
 * da loja, o histórico fica); só um produto criado à mão e nunca vendido é apagado.
 */
export async function removeAdminProduct(id: string): Promise<'archived' | 'deleted'> {
  await ensureDatabase();
  return withTransaction(async (db) => {
    const r = await db.query<{ supplier_id: string | null }>('SELECT supplier_id FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (!r.rowCount) throw new ProductInputError('Produto não encontrado.');
    const sold = await db.query('SELECT 1 FROM stock_commit_lines WHERE product_id = $1 LIMIT 1', [id]);
    if (r.rows[0].supplier_id || sold.rowCount) {
      await db.query(`UPDATE products SET archived = true, data = jsonb_set(data, '{status}', '"inactive"'), updated_at = now() WHERE id = $1`, [id]);
      return 'archived';
    }
    await db.query('DELETE FROM sync_changes WHERE product_id = $1', [id]);
    await db.query('DELETE FROM product_images WHERE product_id = $1', [id]);
    await db.query('DELETE FROM product_stock WHERE product_id = $1', [id]);
    await db.query('DELETE FROM products WHERE id = $1', [id]);
    return 'deleted';
  });
}

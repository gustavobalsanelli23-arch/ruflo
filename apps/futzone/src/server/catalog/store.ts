import 'server-only';
import type { Product, Size } from '@/types/catalog';
import { ALL_SIZES } from '@/types/catalog';
import type { AdminProduct, IntegrationSettings } from '@/types/supplier';
import { DEFAULT_INTEGRATION_SETTINGS } from '@/types/supplier';
import { DEFAULT_PRICE_RULES, sanitizePriceRules, type PriceRules } from '@/lib/pricing';
import type { Db } from '@/server/db/client';
import type { CurrentRecord, StockState } from '@/server/supplier/diff';

/**
 * Acesso ao catálogo guardado no banco. A loja pública lê daqui (com cache), nunca
 * do fornecedor. O estoque vendável de cada tamanho é calculado na leitura:
 * disponível no fornecedor ? limite − vendido : 0.
 */

export interface ProductRow {
  id: string;
  supplier_id: string | null;
  slug: string;
  data: Product;
  price_source: 'rule' | 'manual';
  manual_fields: string[];
  supplier_active: boolean;
  supplier_photos: string[];
  review_state: 'none' | 'pending' | 'rejected';
  review_reason: string | null;
  archived: boolean;
}

interface StockRow {
  product_id: string;
  size: Size;
  supplier_available: boolean;
  cap: number;
  committed: number;
  manual_cap: boolean;
}

export interface StoredProduct {
  row: ProductRow;
  stock: Partial<Record<Size, StockState>>;
}

const sizeOrder = (a: Size, b: Size) => ALL_SIZES.indexOf(a) - ALL_SIZES.indexOf(b);

export async function loadProducts(db: Db, opts: { ids?: string[] } = {}): Promise<StoredProduct[]> {
  const filter = opts.ids ? 'WHERE id = ANY($1)' : '';
  const params = opts.ids ? [opts.ids] : [];
  const [products, stock] = await Promise.all([
    db.query<ProductRow>(
      `SELECT id, supplier_id, slug, data, price_source, manual_fields, supplier_active, supplier_photos, review_state, review_reason, archived
       FROM products ${filter} ORDER BY (data->>'salesCount')::int DESC, created_at DESC, id`,
      params,
    ),
    db.query<StockRow>(`SELECT product_id, size, supplier_available, cap, committed, manual_cap FROM product_stock ${opts.ids ? 'WHERE product_id = ANY($1)' : ''}`, params),
  ]);
  const byProduct = new Map<string, Partial<Record<Size, StockState>>>();
  for (const s of stock.rows) {
    const m = byProduct.get(s.product_id) ?? {};
    m[s.size] = { supplierAvailable: s.supplier_available, cap: s.cap, committed: s.committed, manualCap: s.manual_cap };
    byProduct.set(s.product_id, m);
  }
  return products.rows.map((row) => ({ row, stock: byProduct.get(row.id) ?? {} }));
}

export function sellable(s: StockState | undefined): number {
  return s && s.supplierAvailable ? Math.max(0, s.cap - s.committed) : 0;
}

/** Produto como a loja usa: estoque calculado, sem nenhum dado interno. */
export function toStoreProduct({ row, stock }: StoredProduct): Product {
  const p = row.data;
  const sizes = [...p.sizes].sort(sizeOrder);
  const published = p.status === 'published' && row.review_state === 'none' && !row.archived;
  return {
    ...p,
    sizes,
    stock: Object.fromEntries(sizes.map((s) => [s, sellable(stock[s])])),
    status: published ? 'published' : p.status === 'published' ? 'inactive' : p.status,
  };
}

export function toAdminProduct(sp: StoredProduct): AdminProduct {
  return {
    ...toStoreProduct(sp),
    meta: {
      supplierLinked: !!sp.row.supplier_id,
      supplierActive: sp.row.supplier_active,
      reviewState: sp.row.review_state,
      manualFields: sp.row.manual_fields,
      priceSource: sp.row.price_source,
    },
  };
}

export function toCurrentRecord({ row, stock }: StoredProduct): CurrentRecord {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    product: row.data,
    priceSource: row.price_source,
    manualFields: row.manual_fields,
    supplierActive: row.supplier_active,
    supplierPhotos: row.supplier_photos,
    reviewState: row.review_state,
    stock,
  };
}

/** Catálogo público: só produtos publicados e aprovados, arquivados de fora. */
export async function queryPublicProducts(db: Db): Promise<Product[]> {
  const all = await loadProducts(db);
  return all.filter((sp) => !sp.row.archived && sp.row.review_state === 'none').map(toStoreProduct).filter((p) => p.status === 'published');
}

// Configurações da integração (tabela app_kv)

async function readKv<T>(db: Db, key: string): Promise<T | undefined> {
  const r = await db.query<{ value: T }>('SELECT value FROM app_kv WHERE key = $1', [key]);
  return r.rows[0]?.value;
}

export async function writeKv(db: Db, key: string, value: unknown): Promise<void> {
  await db.query(
    `INSERT INTO app_kv (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}

export function sanitizeSettings(input: unknown): IntegrationSettings {
  const s = { ...DEFAULT_INTEGRATION_SETTINGS };
  if (input && typeof input === 'object') {
    const r = input as Record<string, unknown>;
    for (const k of ['autoSync', 'approveNew', 'approvePriceChanges'] as const) if (typeof r[k] === 'boolean') s[k] = r[k] as boolean;
    if (typeof r.defaultCap === 'number' && Number.isInteger(r.defaultCap) && r.defaultCap >= 0 && r.defaultCap <= 999) s.defaultCap = r.defaultCap;
  }
  return s;
}

export async function getIntegrationSettings(db: Db): Promise<IntegrationSettings> {
  return sanitizeSettings(await readKv(db, 'integration_settings'));
}

export async function getPriceRules(db: Db): Promise<PriceRules> {
  const v = await readKv<unknown>(db, 'price_rules');
  return v ? sanitizePriceRules(v) : { ...DEFAULT_PRICE_RULES };
}

export async function getTeamMap(db: Db): Promise<Map<string, string | null>> {
  const r = await db.query<{ supplier_team_id: string; team_id: string | null }>('SELECT supplier_team_id, team_id FROM supplier_teams');
  return new Map(r.rows.map((x) => [x.supplier_team_id, x.team_id]));
}

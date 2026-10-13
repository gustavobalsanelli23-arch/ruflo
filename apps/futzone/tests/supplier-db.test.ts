import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import type { SupplierModel, SupplierTeam } from '@/types/supplier';
import type { Size } from '@/types/catalog';
import { seedProducts } from '@/data/products';

/**
 * Integração com banco Postgres real (os 8 cenários pedidos). Roda quando
 * TEST_DATABASE_URL aponta para um banco descartável — ele é APAGADO no início:
 *   TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:54329/futzone_test npm test
 */
const URL_ = process.env.TEST_DATABASE_URL;

const FLA = 'team-fla';
const TEAMS: SupplierTeam[] = [
  { id: FLA, name: 'Flamengo' },
  { id: 'team-pal', name: 'Palmeiras' },
];

/** Catálogo do fornecedor espelhando o catálogo inicial da loja. */
function baseModels(): SupplierModel[] {
  return seedProducts.map((p) => ({
    id: p.id.slice(3),
    name: p.name,
    supplierTeamId: p.teamId === 'flamengo' ? FLA : `team-${p.teamId}`,
    category: 'Camisas',
    kids: p.gender === 'infantil',
    sizes: p.sizes.filter((s) => (p.stock[s] ?? 0) > 0),
    photos: [],
    archived: false,
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
  }));
}

function fakeSource(models: () => SupplierModel[], fail?: string) {
  return {
    async fetchModels() {
      if (fail) {
        const { SupplierError } = await import('@/server/supplier/catalogopro.client');
        throw new SupplierError(fail);
      }
      return models();
    },
    async fetchTeams() {
      return TEAMS;
    },
  };
}

describe.skipIf(!URL_)('integração com banco (Postgres)', () => {
  let db: Client;
  let mod: {
    runSync: typeof import('@/server/supplier/sync.service').runSync;
    commitOrderStock: typeof import('@/server/catalog/stock').commitOrderStock;
    approveProduct: typeof import('@/server/supplier/decisions').approveProduct;
    savePriceRules: typeof import('@/server/supplier/decisions').savePriceRules;
    queryPublicProducts: typeof import('@/server/catalog/store').queryPublicProducts;
    getPool: typeof import('@/server/db/client').getPool;
    closeDatabase: typeof import('@/server/db/migrate').closeDatabase;
    ensureDatabase: typeof import('@/server/db/migrate').ensureDatabase;
    migrateDatabase: typeof import('@/server/db/migrate').migrateDatabase;
  };
  let models: SupplierModel[];
  const flaProduct = seedProducts.find((p) => p.teamId === 'flamengo' && p.sizes.some((s) => (p.stock[s] ?? 0) > 0))!;
  const flaId = flaProduct.id.slice(3);

  const stockOf = async (productId: string, size: string) =>
    (await db.query('SELECT supplier_available, cap, committed FROM product_stock WHERE product_id = $1 AND size = $2', [productId, size])).rows[0];
  const sync = () => mod.runSync({ trigger: 'manual', source: fakeSource(() => models) });

  beforeAll(async () => {
    db = new Client({ connectionString: URL_ });
    await db.connect();
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    process.env.DATABASE_URL = URL_;
    const [sync, stock, decisions, store, client, migrate] = await Promise.all([
      import('@/server/supplier/sync.service'),
      import('@/server/catalog/stock'),
      import('@/server/supplier/decisions'),
      import('@/server/catalog/store'),
      import('@/server/db/client'),
      import('@/server/db/migrate'),
    ]);
    mod = {
      runSync: sync.runSync,
      commitOrderStock: stock.commitOrderStock,
      approveProduct: decisions.approveProduct,
      savePriceRules: decisions.savePriceRules,
      queryPublicProducts: store.queryPublicProducts,
      getPool: client.getPool,
      closeDatabase: migrate.closeDatabase,
      ensureDatabase: migrate.ensureDatabase,
      migrateDatabase: migrate.migrateDatabase,
    };
    models = baseModels();
  });

  afterAll(async () => {
    await mod?.closeDatabase();
    await db?.end();
  });

  it('primeira carga: os 217 produtos atuais entram no banco, com as fotos existentes', async () => {
    await mod.ensureDatabase();
    await mod.ensureDatabase(); // idempotente
    const { rows } = await db.query('SELECT count(*)::int AS n FROM products');
    expect(rows[0].n).toBe(seedProducts.length);
    const pub = await mod.queryPublicProducts(mod.getPool());
    const p = pub.find((x) => x.id === flaProduct.id)!;
    expect(p.images[0].src).toMatch(/^\/produtos\//);
    expect(p.stock).toEqual(flaProduct.stock);
  });

  it('tabela de preços nova: aplicada uma vez nos preços pela tabela, preço manual preservado', async () => {
    const [a, b] = seedProducts.filter((p) => p.price === 16990).slice(0, 2);
    // Simula um banco criado com a tabela antiga: preços antigos, um deles manual, e uma pendência velha.
    await db.query(`DELETE FROM app_kv WHERE key = 'price_table_v2'`);
    await db.query(`UPDATE products SET data = jsonb_set(data, '{price}', '34990') WHERE id = $1`, [a.id]);
    await db.query(`UPDATE products SET data = jsonb_set(data, '{price}', '29990'), price_source = 'manual' WHERE id = $1`, [b.id]);
    await db.query(`INSERT INTO sync_changes (product_id, kind, summary, before, after, state) VALUES ($1, 'preco', 'velha', '34990', '39990', 'pending')`, [a.id]);
    await mod.migrateDatabase();
    const price = async (id: string) => Number((await db.query(`SELECT data->>'price' AS p FROM products WHERE id = $1`, [id])).rows[0].p);
    expect(await price(a.id)).toBe(16990);
    expect(await price(b.id)).toBe(29990);
    expect((await db.query(`SELECT count(*)::int AS n FROM sync_changes WHERE state = 'pending' AND kind = 'preco'`)).rows[0].n).toBe(0);
    expect((await db.query(`SELECT count(*)::int AS n FROM sync_changes WHERE product_id = $1 AND kind = 'preco' AND state = 'applied'`, [a.id])).rows[0].n).toBe(1);
    // Segunda vez não muda nada (roda uma vez só).
    await db.query(`UPDATE products SET data = jsonb_set(data, '{price}', '34990') WHERE id = $1`, [a.id]);
    await mod.migrateDatabase();
    expect(await price(a.id)).toBe(34990);
    // Volta ao normal para os próximos testes.
    await db.query(`UPDATE products SET data = jsonb_set(data, '{price}', '16990'), price_source = 'rule' WHERE id = ANY($1)`, [[a.id, b.id]]);
    await db.query(`DELETE FROM sync_changes`);
  });

  it('7. sincronizações repetidas com o mesmo catálogo não duplicam nem mudam nada', async () => {
    const a = await sync();
    const b = await sync();
    expect(a.status).toBe('ok');
    expect(a.counts).toMatchObject({ created: 0, updated: 0, unavailable: 0, restocked: 0, pending: 0 });
    expect(b.counts).toMatchObject({ created: 0, updated: 0, unavailable: 0, restocked: 0, pending: 0 });
    expect((await db.query('SELECT count(*)::int AS n FROM products')).rows[0].n).toBe(seedProducts.length);
    expect((await db.query('SELECT count(*)::int AS n FROM sync_changes')).rows[0].n).toBe(0);
  });

  it('1. produto novo aparece só depois da aprovação', async () => {
    models.push({ id: 'novo0000000001', name: 'Camisa Flamengo Nova III 26/27', supplierTeamId: FLA, category: 'Camisas', kids: false, sizes: ['M', 'G'], photos: [], archived: false, createdAt: '2026-10-11T00:00:00', updatedAt: '2026-10-11T00:00:00' });
    const r = await sync();
    expect(r.counts.created).toBe(1);
    let pub = await mod.queryPublicProducts(mod.getPool());
    expect(pub.some((p) => p.id === 'fz-novo0000000001')).toBe(false);
    await mod.approveProduct('fz-novo0000000001', { price: 37990 });
    pub = await mod.queryPublicProducts(mod.getPool());
    const novo = pub.find((p) => p.id === 'fz-novo0000000001')!;
    expect(novo.price).toBe(37990);
    expect(novo.stock).toMatchObject({ M: 12, G: 12, P: 0 });
    expect((await sync()).counts.created).toBe(0); // não é proposto de novo
  });

  it('2. mudança de preço pela tabela aguarda aprovação; preço editado à mão não muda', async () => {
    const r = await mod.savePriceRules({ ...(await import('@/lib/pricing')).DEFAULT_PRICE_RULES, torcedor: 17990 });
    expect(r.pending).toBe(true);
    expect(r.changes).toBeGreaterThan(0);
    const pending = await db.query(`SELECT count(*)::int AS n FROM sync_changes WHERE kind = 'preco' AND state = 'pending'`);
    expect(pending.rows[0].n).toBe(r.changes);
    // O produto novo teve preço digitado na aprovação: não entra na lista.
    expect((await db.query(`SELECT 1 FROM sync_changes WHERE product_id = 'fz-novo0000000001' AND kind = 'preco'`)).rowCount).toBe(0);
    // Sincronizar de novo não duplica as pendências.
    await sync();
    expect((await db.query(`SELECT count(*)::int AS n FROM sync_changes WHERE kind = 'preco' AND state = 'pending'`)).rows[0].n).toBe(r.changes);
  });

  it('4. um tamanho esgota: só ele fica indisponível', async () => {
    const m = models.find((x) => x.id === flaId)!;
    const [gone, ...rest] = m.sizes as Size[];
    m.sizes = rest;
    await sync();
    const p = (await mod.queryPublicProducts(mod.getPool())).find((x) => x.id === flaProduct.id)!;
    expect(p.stock[gone]).toBe(0);
    for (const s of rest) expect(p.stock[s]).toBe(12);
    m.sizes = [gone, ...rest];
  });

  it('3 e 5. produto esgota e depois é reposto com o limite renovado', async () => {
    const m = models.find((x) => x.id === flaId)!;
    const size = m.sizes[0] as Size;
    const sizes = m.sizes;
    await sync(); // repõe o tamanho que esgotou no teste anterior
    expect(await mod.commitOrderStock('pedido-teste-1', [{ productId: flaProduct.id, size, quantity: 2 }])).toEqual({ ok: true, repeated: false });
    expect((await stockOf(flaProduct.id, size)).committed).toBe(2);

    m.sizes = [];
    const out = await sync();
    expect(out.counts.unavailable).toBe(1);
    let p = (await mod.queryPublicProducts(mod.getPool())).find((x) => x.id === flaProduct.id)!;
    expect(Object.values(p.stock).every((q) => q === 0)).toBe(true); // continua na loja, como esgotado

    m.sizes = sizes;
    const back = await sync();
    expect(back.counts.restocked).toBe(1);
    p = (await mod.queryPublicProducts(mod.getPool())).find((x) => x.id === flaProduct.id)!;
    expect(p.stock[size]).toBe(12);
    expect((await stockOf(flaProduct.id, size)).committed).toBe(0);
    // Pedidos antigos continuam registrados.
    expect((await db.query(`SELECT order_id FROM stock_commits`)).rows).toEqual([{ order_id: 'pedido-teste-1' }]);
  });

  it('6. falha de conexão ou resposta truncada: execução falha e o catálogo fica intacto', async () => {
    const snapshot = async () => (await db.query(`SELECT md5(string_agg(id || data::text || supplier_active::text, ',' ORDER BY id)) AS h FROM products`)).rows[0].h;
    const stockSnap = async () => (await db.query(`SELECT md5(string_agg(product_id || size || supplier_available::text || cap || committed, ',' ORDER BY product_id, size)) AS h FROM product_stock`)).rows[0].h;
    const [before, beforeStock] = [await snapshot(), await stockSnap()];

    const down = await mod.runSync({ trigger: 'cron', source: fakeSource(() => models, 'Não foi possível acessar o fornecedor (sem conexão).') });
    expect(down.status).toBe('failed');
    const truncated = await mod.runSync({ trigger: 'cron', source: fakeSource(() => models.slice(0, 10)) });
    expect(truncated.status).toBe('failed');
    expect(truncated.errors[0]).toMatch(/incompleta/);

    expect(await snapshot()).toBe(before);
    expect(await stockSnap()).toBe(beforeStock);
    const runs = await db.query(`SELECT status, errors FROM sync_runs ORDER BY id DESC LIMIT 2`);
    expect(runs.rows.map((r) => r.status)).toEqual(['failed', 'failed']);
  });

  it('8. compra simultânea do último item: só um pedido consegue', async () => {
    const size = models.find((x) => x.id === flaId)!.sizes[0] as Size;
    await db.query(`UPDATE product_stock SET cap = 1, committed = 0 WHERE product_id = $1 AND size = $2`, [flaProduct.id, size]);
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => mod.commitOrderStock(`corrida-${i}`, [{ productId: flaProduct.id, size, quantity: 1 }])),
    );
    const ok = results.filter((r) => r.ok);
    expect(ok).toHaveLength(1);
    for (const r of results.filter((x) => !x.ok)) {
      expect(r).toMatchObject({ ok: false, issues: [{ productId: flaProduct.id, size, available: 0, kind: 'indisponivel' }] });
    }
    expect(await stockOf(flaProduct.id, size)).toMatchObject({ cap: 1, committed: 1 });
    // Só o pedido que levou o item fica registrado.
    expect((await db.query(`SELECT count(*)::int AS n FROM stock_commits WHERE order_id LIKE 'corrida-%'`)).rows[0].n).toBe(1);
    // Reenviar o mesmo pedido não baixa de novo.
    const winner = results.findIndex((r) => r.ok);
    expect(await mod.commitOrderStock(`corrida-${winner}`, [{ productId: flaProduct.id, size, quantity: 1 }])).toEqual({ ok: true, repeated: true });
    expect((await stockOf(flaProduct.id, size)).committed).toBe(1);
  });

  it('duas sincronizações ao mesmo tempo: a segunda é recusada, sem duplicar nada', async () => {
    const slow = {
      async fetchModels() {
        await new Promise((r) => setTimeout(r, 300));
        return models;
      },
      async fetchTeams() {
        return TEAMS;
      },
    };
    const results = await Promise.allSettled([mod.runSync({ trigger: 'manual', source: slow }), mod.runSync({ trigger: 'cron', source: slow })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { message: 'Já existe uma sincronização em andamento.' } });
    // A trava é liberada ao terminar.
    expect((await sync()).status).toBe('ok');
  });

  it('pedido com um item sem estoque não baixa nenhum item (tudo ou nada)', async () => {
    const sizes = models.find((x) => x.id === flaId)!.sizes as Size[];
    const [sold, free] = [sizes[0], sizes[1]];
    const before = await stockOf(flaProduct.id, free);
    const r = await mod.commitOrderStock('misto-1', [
      { productId: flaProduct.id, size: free, quantity: 1 },
      { productId: flaProduct.id, size: sold, quantity: 1 },
    ]);
    expect(r.ok).toBe(false);
    expect(await stockOf(flaProduct.id, free)).toEqual(before);
  });
});

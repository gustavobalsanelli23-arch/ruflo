import 'server-only';
import { seedProducts, DEFAULT_SIZE_CAP } from '@/data/products';
import { getPool, withTransaction } from './client';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

/**
 * Cria as tabelas (se faltarem) e, só na primeira vez, carrega o catálogo atual
 * (os 217 produtos com as fotos de /public/produtos) como ponto de partida.
 * Nunca apaga nem sobrescreve dados existentes.
 */

let ready: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  ready ??= migrate().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

async function migrate(): Promise<void> {
  await withTransaction(async (db) => {
    // Uma migração por vez, mesmo com várias instâncias subindo juntas.
    await db.query('SELECT pg_advisory_xact_lock(7226043)');
    await db.query(SCHEMA_SQL);
    const done = await db.query(`SELECT value FROM app_kv WHERE key = 'seeded'`);
    if (done.rowCount) return;

    // Em lote: uma consulta para os produtos e outra para o estoque.
    const rows = seedProducts.map((p) => ({ id: p.id, supplier_id: p.id.startsWith('fz-') ? p.id.slice(3) : null, slug: p.slug, data: p }));
    await db.query(
      `INSERT INTO products (id, supplier_id, slug, data)
       SELECT id, supplier_id, slug, data FROM jsonb_to_recordset($1::jsonb) AS x(id text, supplier_id text, slug text, data jsonb)
       ON CONFLICT DO NOTHING`,
      [JSON.stringify(rows)],
    );
    const stock = seedProducts.flatMap((p) => p.sizes.map((size) => ({ product_id: p.id, size, supplier_available: (p.stock[size] ?? 0) > 0, cap: DEFAULT_SIZE_CAP })));
    await db.query(
      `INSERT INTO product_stock (product_id, size, supplier_available, cap)
       SELECT product_id, size, supplier_available, cap FROM jsonb_to_recordset($1::jsonb) AS x(product_id text, size text, supplier_available boolean, cap integer)
       ON CONFLICT DO NOTHING`,
      [JSON.stringify(stock)],
    );
    await db.query(`INSERT INTO app_kv (key, value) VALUES ('seeded', $1)`, [JSON.stringify({ at: new Date().toISOString(), products: seedProducts.length })]);
    await db.query(`INSERT INTO app_kv (key, value) VALUES ('schema_version', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [JSON.stringify(SCHEMA_VERSION)]);
  });
}

/** Só para testes: encerra o pool. */
export async function closeDatabase(): Promise<void> {
  ready = null;
  await getPool().end();
}

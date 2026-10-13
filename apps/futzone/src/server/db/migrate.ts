import 'server-only';
import type { PoolClient } from 'pg';
import type { Product } from '@/types/catalog';
import { seedProducts, DEFAULT_SIZE_CAP } from '@/data/products';
import { teams } from '@/data/teams';
import { DEFAULT_PRICE_RULES, rulePrice } from '@/lib/pricing';
import { getPool, withTransaction } from './client';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

/**
 * Cria as tabelas (se faltarem) e, só na primeira vez, carrega o catálogo atual
 * (os 217 produtos com as fotos de /public/produtos) como ponto de partida.
 * Nunca apaga nem sobrescreve dados existentes.
 */

let ready: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  ready ??= migrateDatabase().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

/** Aplica o esquema e as migrações de dados pendentes (idempotente). */
export async function migrateDatabase(): Promise<void> {
  await withTransaction(async (db) => {
    // Uma migração por vez, mesmo com várias instâncias subindo juntas.
    await db.query('SELECT pg_advisory_xact_lock(7226043)');
    await db.query(SCHEMA_SQL);
    const done = await db.query(`SELECT value FROM app_kv WHERE key = 'seeded'`);
    if (!done.rowCount) await seed(db);
    await applyPriceTableV2(db);
  });
}

async function seed(db: PoolClient): Promise<void> {
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
}

const PRICE_TABLE_V2 = 'price_table_v2';
const brl = (c: number) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`;

/**
 * Tabela de preços definida pela loja (Torcedor, Infantil e Conjunto R$ 169,90;
 * Jogador e Especial R$ 189,90; Retrô R$ 209,90). Roda uma vez só: grava a tabela
 * e aplica nos produtos com preço pela tabela. Preço editado à mão não muda.
 */
async function applyPriceTableV2(db: PoolClient): Promise<void> {
  const flag = await db.query('SELECT 1 FROM app_kv WHERE key = $1', [PRICE_TABLE_V2]);
  if (flag.rowCount) return;

  await db.query(
    `INSERT INTO app_kv (key, value, updated_at) VALUES ('price_rules', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(DEFAULT_PRICE_RULES)],
  );
  const r = await db.query<{ id: string; data: Product }>(
    `SELECT id, data FROM products WHERE price_source = 'rule' AND NOT ('price' = ANY(manual_fields))`,
  );
  const changes = r.rows
    .map(({ id, data }) => {
      const country = teams.find((t) => t.id === data.teamId)?.country;
      const price = rulePrice({ name: data.name, category: data.category, kids: data.gender === 'infantil', teamCountry: country });
      return { id, before: data.price, price };
    })
    .filter((c) => c.price !== c.before);
  if (changes.length) {
    await db.query(
      `UPDATE products p SET data = jsonb_set(p.data, '{price}', to_jsonb(x.price)), updated_at = now()
       FROM jsonb_to_recordset($1::jsonb) AS x(id text, price integer) WHERE p.id = x.id`,
      [JSON.stringify(changes)],
    );
    await db.query(
      `INSERT INTO sync_changes (product_id, kind, summary, before, after, state, decided_at)
       SELECT x.id, 'preco', x.summary, to_jsonb(x.before), to_jsonb(x.price), 'applied', now()
       FROM jsonb_to_recordset($1::jsonb) AS x(id text, before integer, price integer, summary text)`,
      [JSON.stringify(changes.map((c) => ({ ...c, summary: `Nova tabela de preços: ${brl(c.before)} → ${brl(c.price)}` })))],
    );
  }
  // Propostas de preço da tabela antiga ficam sem efeito.
  await db.query(`UPDATE sync_changes SET state = 'rejected', decided_at = now() WHERE state = 'pending' AND kind = 'preco'`);
  await db.query('INSERT INTO app_kv (key, value) VALUES ($1, $2)', [PRICE_TABLE_V2, JSON.stringify({ at: new Date().toISOString(), updated: changes.length })]);
}

/** Só para testes: encerra o pool. */
export async function closeDatabase(): Promise<void> {
  ready = null;
  await getPool().end();
}

import 'server-only';
import type { PoolClient } from 'pg';
import { teams as storeTeams } from '@/data/teams';
import type { SupplierModel, SupplierTeam } from '@/types/supplier';
import { getPool, withTransaction, type Db } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';
import { getIntegrationSettings, getPriceRules, getTeamMap, loadProducts, toCurrentRecord } from '@/server/catalog/store';
import { catalogoProSource, SupplierError, type SupplierCatalogSource } from './catalogopro.client';
import { checkCoverage, diffCatalog, type DiffResult, type PlannedChange } from './diff';
import { autoMapTeams } from './mapping';
import { downloadPhotos, photoPath } from './images';

/**
 * Sincronização com o fornecedor:
 *   1. lê o catálogo do fornecedor (fora de qualquer transação);
 *   2. compara com o da loja (diffCatalog, função pura);
 *   3. aplica tudo numa única transação e registra a execução e as mudanças.
 * Se o fornecedor falhar ou responder algo estranho, a execução fica registrada
 * como falha e o catálogo da loja continua exatamente como estava.
 */

export interface SyncOutcome {
  runId: number;
  status: 'ok' | 'failed';
  counts: DiffResult['counts'];
  errors: string[];
}

export interface SyncOptions {
  trigger: 'manual' | 'cron';
  source?: SupplierCatalogSource;
  /** Chamado depois de uma sincronização que mudou o catálogo (revalidar cache). */
  onCatalogChanged?: () => void;
}

const LEASE_MINUTES = 10;
const EMPTY_COUNTS: DiffResult['counts'] = { found: 0, created: 0, updated: 0, unavailable: 0, restocked: 0, pending: 0 };

export class SyncBusyError extends Error {
  constructor() {
    super('Já existe uma sincronização em andamento.');
  }
}

export async function runSync(opts: SyncOptions): Promise<SyncOutcome> {
  await ensureDatabase();
  const source = opts.source ?? catalogoProSource;
  const token = await acquireSyncLease();
  if (!token) throw new SyncBusyError();
  try {
    return await syncLocked(opts, source);
  } finally {
    await getPool().query(`DELETE FROM app_kv WHERE key = 'sync_lock' AND value->>'token' = $1`, [token]).catch(() => undefined);
  }
}

/**
 * Trava "uma sincronização por vez" gravada no banco, com prazo: funciona com o
 * pooler do Neon (que troca a conexão entre consultas) e se solta sozinha se a
 * função for interrompida no meio.
 */
async function acquireSyncLease(): Promise<string | null> {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const r = await getPool().query(
    `INSERT INTO app_kv (key, value, updated_at) VALUES ('sync_lock', jsonb_build_object('token', $1::text, 'until', now() + interval '${LEASE_MINUTES} minutes'), now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
     WHERE (app_kv.value->>'until')::timestamptz < now()
     RETURNING key`,
    [token],
  );
  return r.rowCount ? token : null;
}

async function syncLocked(opts: SyncOptions, source: SupplierCatalogSource): Promise<SyncOutcome> {
  const pool = getPool();
  const run = await pool.query<{ id: string }>(`INSERT INTO sync_runs (trigger, status) VALUES ($1, 'running') RETURNING id`, [opts.trigger]);
  const runId = Number(run.rows[0].id);

  const fail = async (message: string): Promise<SyncOutcome> => {
    await pool.query(`UPDATE sync_runs SET status = 'failed', finished_at = now(), errors = $2 WHERE id = $1`, [runId, JSON.stringify([message])]);
    return { runId, status: 'failed', counts: EMPTY_COUNTS, errors: [message] };
  };

  let models: SupplierModel[];
  let supplierTeams: SupplierTeam[];
  try {
    [models, supplierTeams] = await Promise.all([source.fetchModels(), source.fetchTeams()]);
  } catch (err) {
    return fail(err instanceof SupplierError ? err.message : 'Falha inesperada ao ler o fornecedor.');
  }

  let result: DiffResult;
  try {
    result = await withTransaction(async (db) => {
      const settings = await getIntegrationSettings(db);
      const rules = await getPriceRules(db);
      const current = (await loadProducts(db)).map(toCurrentRecord);
      const coverage = checkCoverage(current, models);
      if (coverage) throw new SupplierError(coverage);

      const teamMap = autoMapTeams(supplierTeams, storeTeams, await getTeamMap(db));
      await saveTeamMap(db, supplierTeams, teamMap);

      const pendingRows = await db.query<{ product_id: string; kind: string; after: unknown }>(`SELECT product_id, kind, after FROM sync_changes WHERE state = 'pending'`);
      const pending = new Map(pendingRows.rows.map((r) => [`${r.product_id}:${r.kind}`, r.after]));

      const diff = diffCatalog({ current, models, teamMap, teams: storeTeams, rules, settings, pending });
      await applyDiff(db, diff, runId);
      await db.query(
        `INSERT INTO app_kv (key, value) VALUES ('unmapped_teams', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [JSON.stringify(Object.fromEntries(diff.unmappedTeams))],
      );
      await db.query(`UPDATE products SET supplier_seen_at = now() WHERE supplier_id = ANY($1)`, [models.map((m) => m.id)]);
      return diff;
    });
  } catch (err) {
    return fail(err instanceof SupplierError ? err.message : `Erro ao gravar a sincronização: ${err instanceof Error ? err.message : 'desconhecido'}`);
  }

  // Produtos novos publicados direto (sem aprovação): fotos baixadas depois do commit.
  const errors = [...result.warnings];
  for (const ins of result.inserts) {
    if (ins.record.reviewState === 'pending' || !ins.record.supplierPhotos.length) continue;
    const photoErrors = await storeSupplierPhotos(ins.record.id, ins.record.supplierPhotos);
    errors.push(...photoErrors.map((e) => `${ins.record.product.name}: ${e}`));
  }
  if (result.unmappedTeams.size) {
    const n = [...result.unmappedTeams.values()].reduce((a, b) => a + b, 0);
    errors.push(`${n} produto(s) do fornecedor aguardam um time correspondente na loja (veja "Times do fornecedor").`);
  }

  const c = result.counts;
  await pool.query(
    `UPDATE sync_runs SET status = 'ok', finished_at = now(), found = $2, created = $3, updated = $4, unavailable = $5, restocked = $6, pending = $7, errors = $8 WHERE id = $1`,
    [runId, c.found, c.created, c.updated, c.unavailable, c.restocked, c.pending, JSON.stringify(errors.slice(0, 50))],
  );
  await pool.query(`INSERT INTO app_kv (key, value) VALUES ('last_sync_ok', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify({ runId, at: new Date().toISOString() })]);
  if (result.changes.length || result.inserts.length || result.stock.length) opts.onCatalogChanged?.();
  return { runId, status: 'ok', counts: c, errors };
}

async function saveTeamMap(db: Db, supplierTeams: SupplierTeam[], map: Map<string, string | null>) {
  const rows = supplierTeams.map((t) => ({ supplier_team_id: t.id, supplier_name: t.name, team_id: map.get(t.id) ?? null }));
  if (!rows.length) return;
  // Mapeamento já escolhido (inclusive à mão) nunca é apagado; só o nome é atualizado.
  await db.query(
    `INSERT INTO supplier_teams (supplier_team_id, supplier_name, team_id)
     SELECT supplier_team_id, supplier_name, team_id FROM jsonb_to_recordset($1::jsonb) AS x(supplier_team_id text, supplier_name text, team_id text)
     ON CONFLICT (supplier_team_id) DO UPDATE SET supplier_name = EXCLUDED.supplier_name,
       team_id = COALESCE(supplier_teams.team_id, EXCLUDED.team_id), updated_at = now()`,
    [JSON.stringify(rows)],
  );
}

export async function recordChanges(db: Db, changes: PlannedChange[], runId: number | null): Promise<void> {
  for (const c of changes) {
    if (c.state === 'pending') {
      // Uma pendência por produto e tipo: a proposta mais recente substitui a anterior.
      const upd = await db.query(
        `UPDATE sync_changes SET after = $3, summary = $4, before = $5, run_id = COALESCE($6, run_id), created_at = now()
         WHERE product_id = $1 AND kind = $2 AND state = 'pending'`,
        [c.productId, c.kind, JSON.stringify(c.after), c.summary, JSON.stringify(c.before), runId],
      );
      if (upd.rowCount) continue;
    }
    await db.query(
      `INSERT INTO sync_changes (run_id, product_id, kind, summary, before, after, state, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 = 'applied' THEN now() END)`,
      [runId, c.productId, c.kind, c.summary, JSON.stringify(c.before), JSON.stringify(c.after), c.state],
    );
  }
}

async function applyDiff(db: PoolClient, diff: DiffResult, runId: number): Promise<void> {
  for (const { record, reviewReason } of diff.inserts) {
    await db.query(
      `INSERT INTO products (id, supplier_id, slug, data, supplier_photos, review_state, review_reason, supplier_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [record.id, record.supplierId, record.product.slug, JSON.stringify(record.product), record.supplierPhotos, record.reviewState, reviewReason],
    );
    for (const [size, s] of Object.entries(record.stock)) {
      await db.query(`INSERT INTO product_stock (product_id, size, supplier_available, cap, committed) VALUES ($1, $2, $3, $4, 0)`, [record.id, size, s!.supplierAvailable, s!.cap]);
    }
  }
  for (const u of diff.updates) {
    await db.query(
      `UPDATE products SET
         data = COALESCE($2::jsonb, data),
         supplier_active = COALESCE($3, supplier_active),
         supplier_photos = COALESCE($4, supplier_photos),
         updated_at = now()
       WHERE id = $1`,
      [u.id, u.product ? JSON.stringify(u.product) : null, u.supplierActive ?? null, u.supplierPhotos ?? null],
    );
  }
  for (const w of diff.stock) {
    if (w.mode === 'insert') {
      await db.query(
        `INSERT INTO product_stock (product_id, size, supplier_available, cap, committed) VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (product_id, size) DO UPDATE SET supplier_available = EXCLUDED.supplier_available, updated_at = now()`,
        [w.productId, w.size, w.state.supplierAvailable, w.state.cap],
      );
    } else if (w.mode === 'restock') {
      await db.query(
        `UPDATE product_stock SET supplier_available = true, committed = 0, cap = $3, updated_at = now() WHERE product_id = $1 AND size = $2`,
        [w.productId, w.size, w.state.cap],
      );
    } else {
      await db.query(`UPDATE product_stock SET supplier_available = false, updated_at = now() WHERE product_id = $1 AND size = $2`, [w.productId, w.size]);
    }
  }
  await recordChanges(db, diff.changes, runId);
}

/** Baixa as fotos do fornecedor para um produto e passa a servi-las pela loja. */
export async function storeSupplierPhotos(productId: string, urls: string[]): Promise<string[]> {
  const { photos, errors } = await downloadPhotos(urls);
  if (!photos.length) return errors.length ? errors : ['Nenhuma foto disponível.'];
  await withTransaction(async (db) => {
    const r = await db.query<{ data: { name: string } }>('SELECT data FROM products WHERE id = $1 FOR UPDATE', [productId]);
    if (!r.rowCount) return;
    const name = r.rows[0].data.name;
    await db.query('DELETE FROM product_images WHERE product_id = $1', [productId]);
    const images = [];
    for (const [i, p] of photos.entries()) {
      await db.query('INSERT INTO product_images (product_id, n, bytes, etag) VALUES ($1, $2, $3, $4)', [productId, i + 1, p.bytes, p.etag]);
      images.push({ src: photoPath(productId, i + 1, p.etag), alt: i === 0 ? name : `${name}, foto ${i + 1}` });
    }
    await db.query(`UPDATE products SET data = jsonb_set(data, '{images}', $2::jsonb), updated_at = now() WHERE id = $1`, [productId, JSON.stringify(images)]);
  });
  return errors;
}

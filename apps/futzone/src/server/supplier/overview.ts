import 'server-only';
import type { Size } from '@/types/catalog';
import type { ChangeKind, IntegrationStatus, ReviewItem, SyncChange, SyncRun, TeamMapRow } from '@/types/supplier';
import { getPool } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';
import { getIntegrationSettings, getPriceRules, loadProducts } from '@/server/catalog/store';

/** Leituras do painel "Integração com fornecedor". */

interface RunRow {
  id: string;
  trigger: SyncRun['trigger'];
  status: SyncRun['status'];
  started_at: Date;
  finished_at: Date | null;
  found: number;
  created: number;
  updated: number;
  unavailable: number;
  restocked: number;
  pending: number;
  errors: string[];
}

// Uma execução "running" há mais de 10 minutos foi interrompida (ex.: tempo limite da função).
const STALE_MS = 10 * 60_000;

function toRun(r: RunRow): SyncRun {
  const stale = r.status === 'running' && Date.now() - r.started_at.getTime() > STALE_MS;
  return {
    id: Number(r.id),
    trigger: r.trigger,
    status: stale ? 'failed' : r.status,
    startedAt: r.started_at.toISOString(),
    finishedAt: r.finished_at?.toISOString() ?? null,
    found: r.found,
    created: r.created,
    updated: r.updated,
    unavailable: r.unavailable,
    restocked: r.restocked,
    pending: r.pending,
    errors: stale ? ['A execução foi interrompida antes de terminar. Nada foi alterado.', ...r.errors] : r.errors,
  };
}

export async function listRuns(limit = 20): Promise<SyncRun[]> {
  await ensureDatabase();
  const r = await getPool().query<RunRow>('SELECT * FROM sync_runs ORDER BY id DESC LIMIT $1', [limit]);
  return r.rows.map(toRun);
}

export async function getStatus(): Promise<IntegrationStatus> {
  await ensureDatabase();
  const db = getPool();
  const [settings, priceRules, runs, lastOk, counts] = await Promise.all([
    getIntegrationSettings(db),
    getPriceRules(db),
    listRuns(1),
    db.query<{ value: { at: string } }>(`SELECT value FROM app_kv WHERE key = 'last_sync_ok'`),
    db.query<{ products: string; linked: string; review: string; changes: string; unavailable: string }>(
      `SELECT
         (SELECT count(*) FROM products WHERE NOT archived) AS products,
         (SELECT count(*) FROM products WHERE supplier_id IS NOT NULL AND NOT archived) AS linked,
         (SELECT count(*) FROM products WHERE review_state = 'pending') AS review,
         (SELECT count(*) FROM sync_changes WHERE state = 'pending' AND kind <> 'novo') AS changes,
         (SELECT count(*) FROM products p WHERE supplier_id IS NOT NULL AND NOT archived AND review_state = 'none'
            AND NOT EXISTS (SELECT 1 FROM product_stock s WHERE s.product_id = p.id AND s.supplier_available)) AS unavailable`,
    ),
  ]);
  const lastRun = runs[0] ?? null;
  const c = counts.rows[0];
  return {
    database: true,
    supplierReachable: lastRun && lastRun.status !== 'running' ? lastRun.status === 'ok' : null,
    lastRun,
    lastSuccessAt: lastOk.rows[0]?.value.at ?? null,
    settings,
    priceRules,
    cronConfigured: !!process.env.CRON_SECRET,
    counts: {
      products: Number(c.products),
      supplierLinked: Number(c.linked),
      pendingReview: Number(c.review),
      pendingChanges: Number(c.changes),
      unavailable: Number(c.unavailable),
    },
  };
}

export async function listReview(): Promise<ReviewItem[]> {
  await ensureDatabase();
  const db = getPool();
  const ids = await db.query<{ id: string }>(`SELECT id FROM products WHERE review_state = 'pending' ORDER BY created_at DESC LIMIT 200`);
  const items = await loadProducts(db, { ids: ids.rows.map((r) => r.id) });
  const reasons = await db.query<{ id: string; review_reason: string | null }>(`SELECT id, review_reason FROM products WHERE id = ANY($1)`, [ids.rows.map((r) => r.id)]);
  const reasonById = new Map(reasons.rows.map((r) => [r.id, r.review_reason]));
  return items.map(({ row, stock }) => ({
    productId: row.id,
    name: row.data.name,
    teamId: row.data.teamId,
    price: row.data.price,
    reason: reasonById.get(row.id) ?? null,
    supplierPhotos: row.supplier_photos,
    sizes: row.data.sizes,
    availableSizes: (Object.keys(stock) as Size[]).filter((s) => stock[s]?.supplierAvailable),
  }));
}

export async function listChanges(filter: { state?: string; kind?: string; runId?: number; limit?: number }): Promise<SyncChange[]> {
  await ensureDatabase();
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.state) where.push(`c.state = $${params.push(filter.state)}`);
  if (filter.kind) where.push(`c.kind = $${params.push(filter.kind)}`);
  if (filter.runId) where.push(`c.run_id = $${params.push(filter.runId)}`);
  const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
  const r = await getPool().query<{
    id: string;
    run_id: string | null;
    product_id: string;
    name: string;
    kind: ChangeKind;
    summary: string;
    before: unknown;
    after: unknown;
    state: SyncChange['state'];
    created_at: Date;
  }>(
    `SELECT c.id, c.run_id, c.product_id, p.data->>'name' AS name, c.kind, c.summary, c.before, c.after, c.state, c.created_at
     FROM sync_changes c JOIN products p ON p.id = c.product_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY c.id DESC LIMIT ${limit}`,
    params,
  );
  return r.rows.map((x) => ({
    id: Number(x.id),
    runId: x.run_id ? Number(x.run_id) : null,
    productId: x.product_id,
    productName: x.name,
    kind: x.kind,
    summary: x.summary,
    before: x.before,
    after: x.after,
    state: x.state,
    createdAt: x.created_at.toISOString(),
  }));
}

export async function listTeamMap(): Promise<TeamMapRow[]> {
  await ensureDatabase();
  const db = getPool();
  const [rows, unmapped] = await Promise.all([
    db.query<{ supplier_team_id: string; supplier_name: string; team_id: string | null }>('SELECT supplier_team_id, supplier_name, team_id FROM supplier_teams ORDER BY supplier_name'),
    db.query<{ value: Record<string, number> }>(`SELECT value FROM app_kv WHERE key = 'unmapped_teams'`),
  ]);
  const waiting = unmapped.rows[0]?.value ?? {};
  return rows.rows.map((r) => ({ supplierTeamId: r.supplier_team_id, supplierName: r.supplier_name, teamId: r.team_id, models: waiting[r.supplier_team_id] ?? 0 }));
}

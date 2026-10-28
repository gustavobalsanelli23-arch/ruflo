import { createHash } from 'node:crypto';
import type { Session } from './session';

/**
 * Drives an import through the same RPCs the application server calls, as the
 * user already set on the session. The Storage upload is simulated with the
 * row Supabase Storage writes in storage.objects (subject to its policies).
 */

export type Dataset = 'sales' | 'products' | 'inventory' | 'suppliers';
export type Row = Record<string, unknown>;
export interface Issue {
  row_number: number | null;
  field?: string | null;
  code: string;
  severity: 'error' | 'warning';
  message: string;
  raw_value?: string | null;
}

export interface ImportPlan {
  organizationId: string;
  dataset: Dataset;
  rows: Row[];
  issues?: Issue[];
  batchSize?: number;
  /** Duplicate policy passed to start_import; omitted stops after validation. */
  policy?: 'skip' | 'keep' | 'replace' | 'update' | null;
  fileName?: string;
  /** Distinguishes otherwise identical plans (the SHA-256 of the "file"). */
  contentSeed?: string;
}

export interface ImportRun {
  importId: string;
  path: string;
  previousImportId: string | null;
  summary: Record<string, unknown>;
}

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

export async function createAndUpload(s: Session, plan: Pick<ImportPlan, 'organizationId' | 'dataset' | 'fileName' | 'rows' | 'contentSeed'>) {
  const content = JSON.stringify(plan.rows) + (plan.contentSeed ?? '');
  const size = Buffer.byteLength(content);
  const [created] = await s.query<{ import_id: string; object_path: string; previous_import_id: string | null }>(
    'select * from public.create_import($1, $2, $3, $4, $5, $6)',
    [plan.organizationId, plan.dataset, plan.fileName ?? `${plan.dataset}.csv`, 'csv', size, sha(content)],
  );
  await s.query(
    `insert into storage.objects (bucket_id, name, owner, metadata) values ('imports', $1, auth.uid(), jsonb_build_object('size', $2::bigint))`,
    [created!.object_path, size],
  );
  await s.query('select public.confirm_import_upload($1)', [created!.import_id]);
  await s.query('select public.save_import_mapping($1, $2, $3, null)', [created!.import_id, { coluna: 'campo' }, { decimal: 'br' }]);
  return { importId: created!.import_id, path: created!.object_path, previousImportId: created!.previous_import_id };
}

export async function stageAll(s: Session, importId: string, rows: Row[], issues: Issue[] = [], batchSize = 500) {
  const batches = Math.max(1, Math.ceil(rows.length / batchSize));
  for (let index = 0; index < batches; index++) {
    const slice = rows.slice(index * batchSize, (index + 1) * batchSize);
    const batchIssues = index === 0 ? issues : [];
    await s.query('select * from public.stage_import_batch($1, $2, $3, $4)', [importId, index, JSON.stringify(slice), JSON.stringify(batchIssues)]);
  }
  const [finished] = await s.query<{ summary: Record<string, unknown> }>('select public.finish_validation($1, $2) as summary', [
    importId,
    batches,
  ]);
  return { batches, summary: finished!.summary };
}

export async function commitAll(s: Session, importId: string, policy: string, batches: number) {
  await s.query('select public.start_import($1, $2)', [importId, policy]);
  for (let index = 0; index < batches; index++) {
    await s.query('select * from public.commit_import_batch($1, $2)', [importId, index]);
  }
  const [result] = await s.query<{ final_status: string; inserted_rows: number; skipped_rows: number; rejected_rows: number }>(
    'select * from public.finalize_import($1)',
    [importId],
  );
  return result!;
}

/** Runs the whole flow. Stops after validation when `policy` is undefined. */
export async function runImport(s: Session, plan: ImportPlan): Promise<ImportRun & { result?: Awaited<ReturnType<typeof commitAll>> }> {
  const created = await createAndUpload(s, plan);
  const { batches, summary } = await stageAll(s, created.importId, plan.rows, plan.issues, plan.batchSize);
  const base = { importId: created.importId, path: created.path, previousImportId: created.previousImportId, summary };
  if (plan.policy === undefined) return base;
  const result = await commitAll(s, created.importId, plan.policy ?? 'skip', batches);
  return { ...base, result };
}

let line = 1;
/** A sales line with sensible defaults (row numbers increase across calls). */
export function sale(fields: Partial<Record<string, unknown>> & { sku: string; sold_at: string }): Row {
  return {
    row_number: line++,
    order_id: null,
    product_name: null,
    quantity: 1,
    unit_price: 10,
    discount: 0,
    unit_cost: null,
    kind: 'sale',
    channel: null,
    ...fields,
  };
}

export function numbered<T extends Row>(rows: T[]): T[] {
  return rows.map((row, index) => ({ ...row, row_number: index + 1 }));
}

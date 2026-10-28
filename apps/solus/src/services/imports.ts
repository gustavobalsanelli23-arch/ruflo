import 'server-only';
import { createHash } from 'node:crypto';
import { detectFormat } from '@/lib/ingest/formats';
import type { Dataset, ReadOptions } from '@/lib/ingest/types';
import { logServerError } from '@/lib/log';
import type { SolusClient } from '@/lib/supabase/server';
import type { ImportStatus, Json } from '@/types/database';

/**
 * Server-side reads and checks of the import pipeline. Writes happen in the
 * RPCs (supabase/migrations/20261029100200_* and 20261029100250_*).
 */

export const IMPORTS_BUCKET = 'imports';

export interface ImportRecordRow {
  id: string;
  organizationId: string;
  dataset: Dataset;
  fileName: string;
  status: ImportStatus;
  format: 'csv' | 'xlsx' | null;
  fileSize: number | null;
  sha256: string | null;
  storagePath: string | null;
  createdBy: string | null;
  options: ReadOptions | null;
  mapping: Record<string, string>;
  summary: Record<string, unknown>;
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  duplicateRows: number;
  recordCount: number;
  skippedRows: number;
  batchCount: number | null;
  duplicatePolicy: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  failureReason: string | null;
  verified: boolean;
  createdAt: string;
  completedAt: string | null;
}

const COLUMNS =
  'id, organization_id, dataset, file_name, status, file_format, file_size, file_sha256, storage_path, created_by, options, mapping, summary, total_rows, valid_rows, error_count, warning_count, duplicate_rows, record_count, skipped_rows, batch_count, duplicate_policy, period_start, period_end, failure_reason, file_verified_at, created_at, completed_at';

const asObject = (value: Json | null): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function toOptions(value: Json | null): ReadOptions | null {
  const options = asObject(value);
  if (options.decimal !== 'br' && options.decimal !== 'us') return null;
  return {
    decimal: options.decimal,
    dateOrder: options.dateOrder === 'mdy' || options.dateOrder === 'ymd' ? options.dateOrder : 'dmy',
    snapshotDate: typeof options.snapshotDate === 'string' ? options.snapshotDate : null,
  };
}

/** The import, if it belongs to `organizationId` and the user can see it (RLS). */
export async function getImport(supabase: SolusClient, organizationId: string, importId: string): Promise<ImportRecordRow | null> {
  const { data, error } = await supabase.from('data_imports').select(COLUMNS).eq('id', importId).eq('organization_id', organizationId).maybeSingle();
  if (error) {
    logServerError('importação: ler', error);
    throw new Error('Não foi possível ler a importação.');
  }
  if (!data) return null;
  return {
    id: data.id,
    organizationId: data.organization_id,
    dataset: data.dataset,
    fileName: data.file_name,
    status: data.status,
    format: data.file_format,
    fileSize: data.file_size,
    sha256: data.file_sha256,
    storagePath: data.storage_path,
    createdBy: data.created_by,
    options: toOptions(data.options),
    mapping: asObject(data.mapping) as Record<string, string>,
    summary: asObject(data.summary),
    totalRows: data.total_rows,
    validRows: data.valid_rows,
    errorCount: data.error_count,
    warningCount: data.warning_count,
    duplicateRows: data.duplicate_rows,
    recordCount: data.record_count,
    skippedRows: data.skipped_rows,
    batchCount: data.batch_count,
    duplicatePolicy: data.duplicate_policy,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    failureReason: data.failure_reason,
    verified: data.file_verified_at !== null,
    createdAt: data.created_at,
    completedAt: data.completed_at,
  };
}

/**
 * Downloads the stored original and checks it is the file the browser
 * declared: same size, same SHA-256, and content of the declared format
 * (magic bytes, not the extension).
 */
export async function verifyStoredFile(supabase: SolusClient, record: ImportRecordRow): Promise<'ok' | 'missing' | 'mismatch'> {
  if (!record.storagePath) return 'missing';
  const { data, error } = await supabase.storage.from(IMPORTS_BUCKET).download(record.storagePath);
  if (error || !data) return 'missing';
  const bytes = new Uint8Array(await data.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  const format = detectFormat(bytes, record.fileName);
  if (bytes.length !== record.fileSize || digest !== record.sha256 || !format.ok || format.format !== record.format) return 'mismatch';
  return 'ok';
}

export interface IssueGroup {
  severity: 'error' | 'warning';
  code: string;
  field: string | null;
  message: string;
  occurrences: number;
  sampleRows: number[];
}

export async function getIssueSummary(supabase: SolusClient, importId: string): Promise<IssueGroup[]> {
  const { data, error } = await supabase.rpc('import_issue_summary', { p_import_id: importId });
  if (error) {
    logServerError('importação: resumo de problemas', error);
    return [];
  }
  return (data ?? []).map((row) => ({
    severity: row.severity,
    code: row.code,
    field: row.field,
    message: row.message,
    occurrences: Number(row.occurrences),
    sampleRows: row.sample_rows ?? [],
  }));
}

export interface IssueRow {
  rowNumber: number | null;
  field: string | null;
  severity: 'error' | 'warning';
  message: string;
  rawValue: string | null;
}

export const ISSUES_PAGE = 50;

export async function getIssues(supabase: SolusClient, importId: string, severity: 'error' | 'warning' | null, page: number) {
  let query = supabase
    .from('import_errors')
    .select('row_number, field, severity, message, raw_value', { count: 'exact' })
    .eq('import_id', importId)
    .order('severity')
    .order('row_number', { ascending: true, nullsFirst: true })
    .order('id')
    .range(page * ISSUES_PAGE, page * ISSUES_PAGE + ISSUES_PAGE - 1);
  if (severity) query = query.eq('severity', severity);
  const { data, error, count } = await query;
  if (error) {
    logServerError('importação: listar problemas', error);
    return { rows: [] as IssueRow[], total: 0 };
  }
  return {
    rows: data.map((row) => ({ rowNumber: row.row_number, field: row.field, severity: row.severity, message: row.message, rawValue: row.raw_value })),
    total: count ?? data.length,
  };
}

/** Batches still to commit (to resume an interrupted import). */
export async function pendingBatches(supabase: SolusClient, importId: string): Promise<number[]> {
  const { data, error } = await supabase.from('import_batches').select('batch_index').eq('import_id', importId).is('committed_at', null).order('batch_index');
  if (error) {
    logServerError('importação: lotes pendentes', error);
    throw new Error('Não foi possível ler os lotes da importação.');
  }
  return data.map((row) => row.batch_index);
}

/** Today in the company's time zone (São Paulo), for "date in the future" checks. */
export function todayInBrazil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

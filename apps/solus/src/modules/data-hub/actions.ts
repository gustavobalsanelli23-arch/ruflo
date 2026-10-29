'use server';

import { revalidatePath } from 'next/cache';
import { fieldsOf } from '@/lib/ingest/fields';
import { CONTENT_TYPE } from '@/lib/ingest/formats';
import type { MappedRow } from '@/lib/ingest/mapping';
import { validateRows } from '@/lib/ingest/validate';
import { logServerError } from '@/lib/log';
import { GENERIC_ERROR, mapDatabaseError, type MappedError } from '@/lib/supabase/errors';
import type { SolusClient } from '@/lib/supabase/server';
import {
  commitBatchSchema,
  createImportSchema,
  finishValidationSchema,
  importIdSchema,
  issuesPageSchema,
  saveMappingSchema,
  stageBatchSchema,
  startImportSchema,
} from '@/schemas/imports';
import {
  getImport,
  getIssues,
  getIssueSummary,
  IMPORTS_BUCKET,
  pendingBatches,
  todayInBrazil,
  verifyStoredFile,
  type ImportRecordRow,
  type IssueGroup,
} from '@/services/imports';
import { runAnalysis, type AnalysisOutcome } from '@/services/intelligence';
import { authorize, type Authorized } from '@/services/workspace';

/**
 * Import pipeline, one Server Action per step. Each one re-checks the
 * session, the role (analyst or above) and that the import belongs to the
 * active organization; the database checks all of it again. Rows sent by the
 * browser are re-validated here with the same library, using the reading
 * options stored with the import (not the ones the browser sends).
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: MappedError };

const INVALID: MappedError = { code: 'validation', message: 'Dados inválidos. Atualize a página e tente de novo.' };
const NOT_FOUND: MappedError = { code: 'not_found', message: 'Importação não encontrada nesta organização.' };

function dbFailure(error: { code?: string; message?: string } | null, scope: string): { ok: false; error: MappedError } {
  const mapped = mapDatabaseError(error);
  if (mapped.code === 'unknown') logServerError(scope, error);
  return { ok: false, error: mapped };
}

async function withImport(
  importId: unknown,
  minimum: 'analyst' | 'admin' = 'analyst',
): Promise<{ ok: true; auth: Authorized; record: ImportRecordRow } | { ok: false; error: MappedError }> {
  const id = importIdSchema.safeParse(importId);
  if (!id.success) return { ok: false, error: INVALID };
  const auth = await authorize(minimum);
  if (!auth.ok) return auth;
  const record = await getImport(auth.supabase, auth.workspace.active.organizationId, id.data);
  return record ? { ok: true, auth, record } : { ok: false, error: NOT_FOUND };
}

/* ---------- 1. Arquivo ---------- */

export interface CreatedImport {
  importId: string;
  uploadUrl: string;
  contentType: string;
  previous: { id: string; at: string; status: string } | null;
}

export async function createImportAction(input: unknown): Promise<ActionResult<CreatedImport>> {
  const parsed = createImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const auth = await authorize('analyst');
  if (!auth.ok) return auth;
  const { supabase, workspace } = auth;

  const { data, error } = await supabase.rpc('create_import', {
    p_organization_id: workspace.active.organizationId,
    p_dataset: parsed.data.dataset,
    p_file_name: parsed.data.fileName,
    p_file_format: parsed.data.format,
    p_file_size: parsed.data.fileSize,
    p_file_sha256: parsed.data.sha256,
  });
  const created = data?.[0];
  if (error || !created) return dbFailure(error, 'importação: criar');

  const signed = await supabase.storage.from(IMPORTS_BUCKET).createSignedUploadUrl(created.object_path);
  if (signed.error || !signed.data) {
    logServerError('importação: URL de envio', signed.error);
    await supabase.rpc('cancel_import', { p_import_id: created.import_id });
    return { ok: false, error: { code: 'unavailable', message: 'O armazenamento de arquivos não respondeu. Tente de novo em instantes.' } };
  }
  return {
    ok: true,
    data: {
      importId: created.import_id,
      uploadUrl: signed.data.signedUrl,
      contentType: CONTENT_TYPE[parsed.data.format],
      previous: created.previous_import_id
        ? { id: created.previous_import_id, at: created.previous_import_at ?? '', status: created.previous_import_status ?? '' }
        : null,
    },
  };
}

export async function confirmUploadAction(importId: unknown): Promise<ActionResult<null>> {
  const loaded = await withImport(importId);
  if (!loaded.ok) return loaded;
  const { auth, record } = loaded;
  if (!record.verified) {
    const check = await verifyStoredFile(auth.supabase, record);
    if (check !== 'ok') {
      await auth.supabase.rpc('cancel_import', { p_import_id: record.id });
      return { ok: false, error: mapDatabaseError({ message: check === 'missing' ? 'solus:upload_missing' : 'solus:upload_mismatch' }) };
    }
  }
  const { error } = await auth.supabase.rpc('confirm_import_upload', { p_import_id: record.id });
  return error ? dbFailure(error, 'importação: confirmar envio') : { ok: true, data: null };
}

/* ---------- 3. Mapeamento ---------- */

export async function saveMappingAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = saveMappingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const loaded = await withImport(parsed.data.importId);
  if (!loaded.ok) return loaded;
  const known = new Set(fieldsOf(loaded.record.dataset).map((field) => field.key));
  if (Object.keys(parsed.data.mapping).some((key) => !known.has(key))) return { ok: false, error: INVALID };
  if (parsed.data.options.snapshotDate && parsed.data.options.snapshotDate > todayInBrazil()) {
    return { ok: false, error: { code: 'validation', message: 'A data da contagem não pode estar no futuro.' } };
  }
  const { error } = await loaded.auth.supabase.rpc('save_import_mapping', {
    p_import_id: loaded.record.id,
    p_mapping: parsed.data.mapping,
    p_options: parsed.data.options,
    p_sheet_name: parsed.data.sheetName,
  });
  return error ? dbFailure(error, 'importação: mapeamento') : { ok: true, data: null };
}

/* ---------- 4. Validação ---------- */

export async function stageBatchAction(input: unknown): Promise<ActionResult<{ staged: number; rejected: number; warnings: number }>> {
  const parsed = stageBatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const loaded = await withImport(parsed.data.importId);
  if (!loaded.ok) return loaded;
  const { record, auth } = loaded;
  if (!record.options) return { ok: false, error: mapDatabaseError({ message: 'solus:invalid_mapping' }) };

  const known = new Set(fieldsOf(record.dataset).map((field) => field.key));
  const rows: MappedRow[] = parsed.data.rows.map((row) => ({
    line: row.line,
    values: Object.fromEntries(Object.entries(row.values).filter(([key]) => known.has(key))),
  }));
  const { staged, issues } = validateRows(record.dataset, rows, { options: record.options, today: todayInBrazil() });

  const { data, error } = await auth.supabase.rpc('stage_import_batch', {
    p_import_id: record.id,
    p_batch_index: parsed.data.batchIndex,
    p_rows: staged,
    p_issues: issues,
  });
  const result = data?.[0];
  if (error || !result) return dbFailure(error, 'importação: validar lote');
  return { ok: true, data: { staged: Number(result.staged_rows), rejected: Number(result.rejected_rows), warnings: Number(result.warnings) } };
}

export interface ValidationReport {
  record: ImportRecordRow;
  issues: IssueGroup[];
}

export async function finishValidationAction(input: unknown): Promise<ActionResult<ValidationReport>> {
  const parsed = finishValidationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const loaded = await withImport(parsed.data.importId);
  if (!loaded.ok) return loaded;
  const { auth, record } = loaded;
  const { error } = await auth.supabase.rpc('finish_validation', { p_import_id: record.id, p_expected_batches: parsed.data.batchCount });
  if (error) return dbFailure(error, 'importação: fechar validação');
  return importReportAction(record.id);
}

/** Current state of an import plus its grouped problems (also used to resume). */
export async function importReportAction(importId: unknown): Promise<ActionResult<ValidationReport>> {
  const loaded = await withImport(importId);
  if (!loaded.ok) return loaded;
  const record = await getImport(loaded.auth.supabase, loaded.auth.workspace.active.organizationId, loaded.record.id);
  if (!record) return { ok: false, error: NOT_FOUND };
  return { ok: true, data: { record, issues: await getIssueSummary(loaded.auth.supabase, record.id) } };
}

export async function issuesPageAction(input: unknown) {
  const parsed = issuesPageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: INVALID };
  const loaded = await withImport(parsed.data.importId);
  if (!loaded.ok) return loaded;
  return { ok: true as const, data: await getIssues(loaded.auth.supabase, loaded.record.id, parsed.data.severity, parsed.data.page) };
}

/* ---------- 5 e 6. Confirmação e gravação ---------- */

export async function startImportAction(input: unknown): Promise<ActionResult<{ batches: number[] }>> {
  const parsed = startImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const loaded = await withImport(parsed.data.importId);
  if (!loaded.ok) return loaded;
  const { auth, record } = loaded;
  if (record.status === 'validated') {
    const { error } = await auth.supabase.rpc('start_import', { p_import_id: record.id, p_duplicate_policy: parsed.data.policy });
    if (error) return dbFailure(error, 'importação: iniciar gravação');
  } else if (record.status !== 'processing') {
    return { ok: false, error: mapDatabaseError({ message: 'solus:invalid_import_state' }) };
  }
  return { ok: true, data: { batches: await pendingBatches(auth.supabase, record.id) } };
}

export async function commitBatchAction(input: unknown): Promise<ActionResult<{ inserted: number; skipped: number }>> {
  const parsed = commitBatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID };
  const loaded = await withImport(parsed.data.importId);
  if (!loaded.ok) return loaded;
  const { data, error } = await loaded.auth.supabase.rpc('commit_import_batch', { p_import_id: loaded.record.id, p_batch_index: parsed.data.batchIndex });
  const result = data?.[0];
  if (error || !result) return dbFailure(error, 'importação: gravar lote');
  return { ok: true, data: { inserted: Number(result.inserted_rows), skipped: Number(result.skipped_rows) } };
}

export interface FinishedImport {
  status: string;
  inserted: number;
  skipped: number;
  rejected: number;
  analysis: AnalysisOutcome;
}

export async function finalizeImportAction(importId: unknown): Promise<ActionResult<FinishedImport>> {
  const loaded = await withImport(importId);
  if (!loaded.ok) return loaded;
  const { auth, record } = loaded;
  const { data, error } = await auth.supabase.rpc('finalize_import', { p_import_id: record.id });
  const result = data?.[0];
  if (error || !result) return dbFailure(error, 'importação: concluir');

  // Recalcula as oportunidades com os dados novos.
  const analysis = await runAnalysis({
    supabase: auth.supabase,
    organizationId: auth.workspace.active.organizationId,
    actorId: auth.workspace.user.id,
    trigger: 'import',
    importId: record.id,
  });
  revalidatePath('/', 'layout');
  return {
    ok: true,
    data: {
      status: result.final_status,
      inserted: Number(result.inserted_rows),
      skipped: Number(result.skipped_rows),
      rejected: Number(result.rejected_rows),
      analysis,
    },
  };
}

/* ---------- Cancelar, desfazer e remover ---------- */

export async function cancelImportAction(importId: unknown): Promise<ActionResult<null>> {
  const loaded = await withImport(importId);
  if (!loaded.ok) return loaded;
  const { error } = await loaded.auth.supabase.rpc('cancel_import', { p_import_id: loaded.record.id });
  if (error) return dbFailure(error, 'importação: cancelar');
  revalidatePath('/dados');
  return { ok: true, data: null };
}

export async function revertImportAction(importId: unknown): Promise<ActionResult<{ removed: number; analysis: AnalysisOutcome }>> {
  const loaded = await withImport(importId);
  if (!loaded.ok) return loaded;
  const { auth, record } = loaded;
  const { data, error } = await auth.supabase.rpc('revert_import', { p_import_id: record.id });
  if (error) return dbFailure(error, 'importação: desfazer');
  const analysis = await runAnalysis({
    supabase: auth.supabase,
    organizationId: auth.workspace.active.organizationId,
    actorId: auth.workspace.user.id,
    trigger: 'revert',
    importId: record.id,
  });
  revalidatePath('/', 'layout');
  return { ok: true, data: { removed: Number(data ?? 0), analysis } };
}

/** Removes a canceled, failed or reverted import from the history (owner/admin), with its stored file. */
export async function deleteImportAction(importId: unknown): Promise<ActionResult<null>> {
  const loaded = await withImport(importId, 'admin');
  if (!loaded.ok) return loaded;
  const { auth, record } = loaded;
  if (!['canceled', 'failed', 'reverted'].includes(record.status)) {
    return { ok: false, error: { code: 'conflict', message: 'Desfaça ou cancele a importação antes de removê-la do histórico.' } };
  }
  if (record.storagePath) await removeStoredFile(auth.supabase, record.storagePath);
  const { error, count } = await auth.supabase.from('data_imports').delete({ count: 'exact' }).eq('id', record.id);
  if (error || count === 0) return error ? dbFailure(error, 'importação: remover') : { ok: false, error: { code: 'forbidden', message: GENERIC_ERROR } };
  revalidatePath('/dados');
  return { ok: true, data: null };
}

async function removeStoredFile(supabase: SolusClient, path: string) {
  const { error } = await supabase.storage.from(IMPORTS_BUCKET).remove([path]);
  if (error) logServerError('importação: remover arquivo', error);
}

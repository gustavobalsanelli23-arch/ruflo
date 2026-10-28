import { z } from 'zod';
import { MAX_BATCHES, MAX_FILE_BYTES, UPLOAD_BATCH_ROWS } from '@/lib/ingest/limits';

/** Input of the import Server Actions. Everything from the browser is checked here first. */

export const datasetSchema = z.enum(['sales', 'products', 'inventory', 'suppliers']);
export const importIdSchema = z.uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createImportSchema = z.object({
  dataset: datasetSchema,
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().min(1).max(MAX_FILE_BYTES),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  format: z.enum(['csv', 'xlsx']),
});

export const readOptionsSchema = z.object({
  decimal: z.enum(['br', 'us']),
  dateOrder: z.enum(['dmy', 'mdy', 'ymd']),
  snapshotDate: isoDate.nullable(),
});

export const saveMappingSchema = z.object({
  importId: importIdSchema,
  /** Field key → header name of the chosen column (stored for traceability). */
  mapping: z.record(z.string().max(64), z.string().max(120)),
  options: readOptionsSchema,
  sheetName: z.string().max(120).nullable(),
});

const rawCell = z.union([z.string().max(1000), z.number(), z.boolean(), z.null()]);

export const stageBatchSchema = z.object({
  importId: importIdSchema,
  batchIndex: z.number().int().min(0).max(MAX_BATCHES - 1),
  rows: z
    .array(
      z.object({
        line: z.number().int().min(1).max(2_000_000),
        values: z.record(z.string().max(64), rawCell),
      }),
    )
    .max(UPLOAD_BATCH_ROWS),
});

export const finishValidationSchema = z.object({ importId: importIdSchema, batchCount: z.number().int().min(1).max(MAX_BATCHES) });
export const startImportSchema = z.object({ importId: importIdSchema, policy: z.enum(['skip', 'keep', 'replace', 'update']) });
export const commitBatchSchema = z.object({ importId: importIdSchema, batchIndex: z.number().int().min(0).max(MAX_BATCHES - 1) });
export const issuesPageSchema = z.object({
  importId: importIdSchema,
  severity: z.enum(['error', 'warning']).nullable(),
  page: z.number().int().min(0).max(1000),
});

const percent = (min: number, max: number) => z.coerce.number({ error: 'Informe um número.' }).min(min, `Entre ${min}% e ${max}%.`).max(max, `Entre ${min}% e ${max}%.`);
const days = (min: number, max: number) =>
  z.coerce
    .number({ error: 'Informe um número.' })
    .int('Use um número inteiro de dias.')
    .min(min, `Entre ${min} e ${max} dias.`)
    .max(max, `Entre ${min} e ${max} dias.`);

/** Analysis parameters as typed in Settings (percentages as 0–100). */
export const analysisSettingsSchema = z
  .object({
    min_margin: percent(0, 90),
    max_discount_rate: percent(1, 90),
    stalled_days: days(14, 365),
    velocity_window_days: days(28, 365),
    default_lead_time_days: days(0, 180),
    high_turnover_days: days(1, 365),
    low_turnover_days: days(2, 730),
    excess_coverage_days: days(2, 730),
    target_coverage_days: days(1, 365),
    drop_threshold: percent(5, 90),
  })
  .refine((value) => value.high_turnover_days < value.low_turnover_days, {
    path: ['low_turnover_days'],
    message: 'Precisa ser maior que o limite de giro alto.',
  })
  .refine((value) => value.target_coverage_days < value.excess_coverage_days, {
    path: ['excess_coverage_days'],
    message: 'Precisa ser maior que a cobertura-alvo.',
  });

export const opportunityStatusSchema = z.object({
  opportunityId: z.uuid(),
  status: z.enum(['new', 'reviewing', 'in-progress', 'done', 'dismissed']),
  note: z.string().trim().max(500).nullable(),
});

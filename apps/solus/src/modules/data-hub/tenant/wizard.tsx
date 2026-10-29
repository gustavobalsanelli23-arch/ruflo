'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { UPLOAD_BATCH_ROWS } from '@/lib/ingest/limits';
import { applyMapping, describeMapping, mappingProblems, suggestMapping, type MappedRow } from '@/lib/ingest/mapping';
import { detectDateOrder, detectDecimalStyle } from '@/lib/ingest/normalize';
import type { Dataset, Mapping, ReadOptions } from '@/lib/ingest/types';
import type { ImportRecordRow, IssueGroup } from '@/services/imports';
import {
  cancelImportAction,
  commitBatchAction,
  confirmUploadAction,
  createImportAction,
  finalizeImportAction,
  finishValidationAction,
  importReportAction,
  saveMappingAction,
  stageBatchAction,
  startImportAction,
  type FinishedImport,
} from '../actions';
import { Stepper } from '../import-steps';
import { loadFile, tableOf, uploadFile, type LoadedFile } from './read-file';
import { ConfirmStep, ProcessingStep, ResultStep, ValidationStep, type Policy } from './review-steps';
import { FileStep, MappingStep, PreviewStep, type Busy } from './source-steps';

export const TENANT_STEPS = ['Arquivo', 'Pré-visualização', 'Mapeamento', 'Validação', 'Confirmação', 'Processamento', 'Resultado'] as const;

/** Rows per Server Action call, also capped by payload size (the request limit is 1 MB). */
const MAX_PAYLOAD = 800_000;

function batchesOf(rows: MappedRow[]) {
  const batches: MappedRow[][] = [];
  let current: MappedRow[] = [];
  let size = 0;
  for (const row of rows) {
    const rowSize = JSON.stringify(row).length;
    if (current.length > 0 && (current.length >= UPLOAD_BATCH_ROWS || size + rowSize > MAX_PAYLOAD)) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(row);
    size += rowSize;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

const DEFAULT_OPTIONS: ReadOptions = { decimal: 'br', dateOrder: 'dmy', snapshotDate: null };

/**
 * Seven-step import of a real organization. Each step calls a Server Action
 * that checks the session and role and re-validates in the database. An
 * interrupted import can be resumed (`resume`) from the confirmation or the
 * processing step: everything needed after validation lives on the server.
 */
export function ImportWizard({ resume, onShowHistory }: { resume: { importId: string } | null; onShowHistory: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dataset, setDataset] = useState<Dataset>('sales');
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [previous, setPrevious] = useState<{ at: string; status: string } | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [options, setOptions] = useState<ReadOptions>(DEFAULT_OPTIONS);
  const [record, setRecord] = useState<ImportRecordRow | null>(null);
  const [issues, setIssues] = useState<IssueGroup[]>([]);
  const [policy, setPolicy] = useState<Policy>('skip');
  const [result, setResult] = useState<FinishedImport | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const table = useMemo(() => {
    if (!loaded) return null;
    const built = tableOf(loaded, sheet);
    return built.ok ? built : null;
  }, [loaded, sheet]);
  const problems = table ? mappingProblems(mapping, dataset, options, table.headers) : [];

  const go = (next: number) => {
    setError(null);
    setStep(next);
    topRef.current?.scrollIntoView({ block: 'nearest' });
  };

  const reset = () => {
    setLoaded(null);
    setSheet(null);
    setImportId(null);
    setPrevious(null);
    setMapping({});
    setRecord(null);
    setIssues([]);
    setResult(null);
    setBusy(null);
    setError(null);
    setPolicy('skip');
    go(0);
  };

  /* Retomar uma importação validada ou interrompida na gravação. */
  useEffect(() => {
    if (!resume) return;
    let active = true;
    void importReportAction(resume.importId).then((report) => {
      if (!active) return;
      if (!report.ok) {
        toast.error('Não foi possível retomar a importação', { description: report.error.message });
        return;
      }
      setImportId(report.data.record.id);
      setDataset(report.data.record.dataset);
      setRecord(report.data.record);
      setIssues(report.data.issues);
      setPolicy(report.data.record.duplicatePolicy === 'keep' || report.data.record.duplicatePolicy === 'replace' ? report.data.record.duplicatePolicy : 'skip');
      if (report.data.record.status === 'validated') go(4);
      else if (report.data.record.status === 'processing') {
        go(5);
        void process(report.data.record.id, (report.data.record.duplicatePolicy as Policy) ?? 'skip');
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per resumed import
  }, [resume?.importId]);

  const pick = async (file: File) => {
    setError(null);
    setBusy({ label: 'Lendo o arquivo no seu navegador…', progress: null });
    const outcome = await loadFile(file);
    setBusy(null);
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    setLoaded(outcome.loaded);
    setSheet(outcome.loaded.sheets[0]?.name ?? null);
  };

  const remove = async () => {
    if (importId) await cancelImportAction(importId);
    reset();
  };

  const upload = async () => {
    if (!loaded) return;
    if (importId) return go(1);
    const parsed = tableOf(loaded, sheet);
    if (!parsed.ok) return setError(parsed.message);
    setError(null);
    setBusy({ label: 'Registrando a importação…', progress: null });
    const created = await createImportAction({ dataset, fileName: loaded.file.name, fileSize: loaded.file.size, sha256: loaded.sha256, format: loaded.format });
    if (!created.ok) {
      setBusy(null);
      return setError(created.error.message);
    }
    setBusy({ label: 'Enviando o arquivo para o armazenamento privado…', progress: 0 });
    const sent = await uploadFile(created.data.uploadUrl, loaded.file, created.data.contentType, (progress) => setBusy({ label: 'Enviando o arquivo para o armazenamento privado…', progress }));
    if (!sent) {
      await cancelImportAction(created.data.importId);
      setBusy(null);
      return setError('O envio do arquivo falhou. Confira a conexão e tente de novo.');
    }
    setBusy({ label: 'Conferindo o arquivo guardado…', progress: null });
    const confirmed = await confirmUploadAction(created.data.importId);
    setBusy(null);
    if (!confirmed.ok) return setError(confirmed.error.message);
    setImportId(created.data.importId);
    setPrevious(created.data.previous);
    go(1);
  };

  const toMapping = () => {
    if (!table) return;
    const suggestion = suggestMapping(table.headers, dataset);
    setMapping(suggestion.mapping);
    setConfidence(suggestion.confidence);
    const sample = applyMapping({ rows: table.rows.slice(0, 2000) }, suggestion.mapping);
    const values = (field: string) => sample.map((row) => row.values[field] ?? null);
    setOptions({
      decimal: detectDecimalStyle(['quantity', 'unit_price', 'line_total', 'discount', 'unit_cost', 'cost', 'price'].flatMap(values)),
      dateOrder: detectDateOrder([...values('sold_at'), ...values('snapshot_date')]),
      snapshotDate: options.snapshotDate,
    });
    go(2);
  };

  const remap = (column: number, field: string | null) => {
    setMapping((current) => {
      const next: Mapping = Object.fromEntries(Object.entries(current).filter(([, value]) => value !== column));
      if (field) next[field] = column;
      return next;
    });
  };

  const validate = async () => {
    if (!table || !importId) return;
    setError(null);
    setRecord(null);
    go(3);
    setBusy({ label: 'Guardando o mapeamento…', progress: null });
    const saved = await saveMappingAction({ importId, mapping: describeMapping(mapping, table.headers), options, sheetName: loaded?.format === 'xlsx' ? sheet : null });
    if (!saved.ok) {
      setBusy(null);
      return setError(saved.error.message);
    }
    const batches = batchesOf(applyMapping(table, mapping));
    for (let index = 0; index < batches.length; index++) {
      setBusy({ label: `Validando no servidor: lote ${index + 1} de ${batches.length}`, progress: index / batches.length });
      const staged = await stageBatchAction({ importId, batchIndex: index, rows: batches[index] });
      if (!staged.ok) {
        setBusy(null);
        return setError(staged.error.message);
      }
    }
    setBusy({ label: 'Procurando duplicatas e montando o resumo…', progress: null });
    const report = await finishValidationAction({ importId, batchCount: batches.length });
    setBusy(null);
    if (!report.ok) return setError(report.error.message);
    setRecord(report.data.record);
    setIssues(report.data.issues);
    setPolicy(report.data.record.dataset === 'products' || report.data.record.dataset === 'suppliers' ? 'update' : 'skip');
  };

  async function process(id: string, chosen: Policy) {
    setError(null);
    setBusy({ label: 'Preparando a gravação…', progress: 0 });
    const started = await startImportAction({ importId: id, policy: chosen });
    if (!started.ok) {
      setBusy(null);
      return setError(started.error.message);
    }
    const pending = started.data.batches;
    for (let index = 0; index < pending.length; index++) {
      setBusy({ label: `Gravando: lote ${index + 1} de ${pending.length}`, progress: index / Math.max(pending.length, 1) });
      const committed = await commitBatchAction({ importId: id, batchIndex: pending[index] });
      if (!committed.ok) {
        setBusy(null);
        return setError(committed.error.message);
      }
    }
    setBusy({ label: 'Concluindo e recalculando as oportunidades…', progress: 1 });
    const finished = await finalizeImportAction(id);
    setBusy(null);
    if (!finished.ok) return setError(finished.error.message);
    setResult(finished.data);
    router.refresh();
    go(6);
  }

  const cancel = async () => {
    if (importId) {
      const canceled = await cancelImportAction(importId);
      if (!canceled.ok) return toast.error('Não foi possível cancelar', { description: canceled.error.message });
      toast.success('Importação cancelada', { description: 'Nada dela entrou nos painéis.' });
      router.refresh();
    }
    reset();
  };

  return (
    <div ref={topRef} className="flex scroll-mt-24 flex-col gap-6">
      <Stepper current={step} steps={TENANT_STEPS} />
      <h3 className="sr-only" aria-live="polite">
        Etapa {step + 1} de {TENANT_STEPS.length}: {TENANT_STEPS[step]}
      </h3>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 && (
            <FileStep
              dataset={dataset}
              onDataset={setDataset}
              loaded={loaded}
              uploaded={importId !== null}
              busy={busy}
              error={error}
              onPick={(file) => void pick(file)}
              onRemove={() => void remove()}
              onUpload={() => void upload()}
            />
          )}
          {step === 1 && loaded && table && (
            <PreviewStep loaded={loaded} table={table} sheet={sheet} onSheet={setSheet} previous={previous} onBack={() => go(0)} onNext={toMapping} />
          )}
          {step === 2 && table && (
            <MappingStep
              dataset={dataset}
              table={table}
              mapping={mapping}
              confidence={confidence}
              options={options}
              problems={problems}
              busy={busy}
              error={error}
              onMap={remap}
              onOptions={setOptions}
              onBack={() => go(1)}
              onNext={() => void validate()}
            />
          )}
          {step === 3 && (
            <ValidationStep record={record} issues={issues} busy={busy} error={error} onBack={() => go(table ? 2 : 0)} onNext={() => go(4)} onRestart={() => void cancel()} />
          )}
          {step === 4 && record && (
            <ConfirmStep
              record={record}
              policy={policy}
              onPolicy={setPolicy}
              onBack={() => go(3)}
              onConfirm={() => {
                go(5);
                void process(record.id, policy);
              }}
              onCancel={() => void cancel()}
            />
          )}
          {step === 5 && <ProcessingStep busy={busy} error={error} onRetry={() => importId && void process(importId, policy)} onCancel={() => void cancel()} />}
          {step === 6 && result && <ResultStep result={result} onRestart={reset} onHistory={onShowHistory} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

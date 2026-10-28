'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { DataHubData, ImportRecord } from '@/lib/data/types';
import { formatDate, formatNumber } from '@/lib/format';
import { ConfirmStep, ResultStep, ValidationStep } from './import-review-steps';
import { FileStep, MappingStep, PreviewStep, STEPS, Stepper, type Dataset, type PickedFile } from './import-steps';

const MAX_BYTES = 50 * 1024 * 1024;

/**
 * Six-step import: file, preview, column mapping, validation, confirmation
 * and result. Demo only: the chosen file is never read or uploaded; the
 * later steps use the sample spreadsheet so every state can be evaluated.
 */
export function ImportWizard({
  data,
  imports,
  onImported,
  onShowHistory,
}: {
  data: DataHubData;
  imports: ImportRecord[];
  onImported: (record: ImportRecord) => void;
  onShowHistory: () => void;
}) {
  const [step, setStep] = useState(0);
  const [dataset, setDataset] = useState<Dataset>('Vendas');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const [importId, setImportId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(data.sample.mapping.map((m) => [m.source, m.target])),
  );
  const topRef = useRef<HTMLDivElement>(null);

  const { sample } = data;
  const errors = sample.issues.filter((i) => i.severity === 'error').length;
  const warnings = sample.issues.filter((i) => i.severity === 'warning').length;
  const rowsToImport = skipErrors ? sample.totalRows - errors : sample.totalRows;
  const fileName = file && !file.sample ? file.name : sample.fileName;

  const go = (next: number) => {
    setStep(next);
    topRef.current?.scrollIntoView({ block: 'nearest' });
  };

  const pick = (chosen: File | null | undefined) => {
    if (!chosen) return;
    if (!/\.(csv|xlsx|xls)$/i.test(chosen.name)) {
      setFileError(`${chosen.name} não é uma planilha aceita. Envie um arquivo .csv, .xlsx ou .xls.`);
      return;
    }
    if (chosen.size === 0) {
      setFileError(`${chosen.name} está vazio. Exporte a planilha de novo e envie o arquivo com os dados.`);
      return;
    }
    if (chosen.size > MAX_BYTES) {
      setFileError(`${chosen.name} passa de 50 MB. Divida o período em mais de um arquivo, por exemplo um por mês.`);
      return;
    }
    setFileError(null);
    setFile({ name: chosen.name, size: chosen.size, sample: false });
  };

  const restart = () => {
    setFile(null);
    setFileError(null);
    setImportId(null);
    go(0);
  };

  const confirm = () => {
    const now = new Date().toISOString();
    const id = `imp-${now}`;
    onImported({
      id,
      fileName,
      format: /\.xlsx?$/i.test(fileName) ? 'xlsx' : 'csv',
      dataset,
      status: 'processing',
      records: rowsToImport,
      errors: skipErrors ? 0 : errors,
      uploadedAt: now,
      uploadedBy: 'Helena Prado',
      progress: 0.04,
    });
    setImportId(id);
    toast.success('Importação iniciada', { description: 'Ambiente de demonstração: nenhum dado foi enviado ou gravado.' });
    go(5);
  };

  return (
    <div ref={topRef} className="flex scroll-mt-24 flex-col gap-6">
      <Stepper current={step} />
      <h3 className="sr-only" aria-live="polite">
        Etapa {step + 1} de {STEPS.length}: {STEPS[step]}
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
              file={file}
              error={fileError}
              onPick={pick}
              onSample={() => {
                setFileError(null);
                setFile({ name: sample.fileName, size: sample.sizeBytes, sample: true });
              }}
              onRemove={() => setFile(null)}
              onNext={() => go(1)}
            />
          )}
          {step === 1 && <PreviewStep sample={sample} fileName={fileName} onBack={() => go(0)} onNext={() => go(2)} />}
          {step === 2 && (
            <MappingStep
              sample={sample}
              targetFields={data.targetFields}
              mapping={mapping}
              onMap={(source, target) => setMapping((previous) => ({ ...previous, [source]: target }))}
              onBack={() => go(1)}
              onNext={() => go(3)}
            />
          )}
          {step === 3 && <ValidationStep sample={sample} skipErrors={skipErrors} onSkipErrors={setSkipErrors} onBack={() => go(2)} onNext={() => go(4)} />}
          {step === 4 && (
            <ConfirmStep
              rows={[
                ['Arquivo', fileName],
                ['Tipo de dado', dataset],
                ['Linhas a importar', formatNumber(rowsToImport)],
                ['Linhas ignoradas', skipErrors ? `${errors} com erro` : 'Nenhuma'],
                ['Colunas mapeadas', `${Object.values(mapping).filter(Boolean).length} de ${sample.columns.length}`],
                ['Período dos dados', `${formatDate(sample.firstDate)} a ${formatDate(sample.lastDate)}`],
              ]}
              onBack={() => go(3)}
              onConfirm={confirm}
            />
          )}
          {step === 5 && (
            <ResultStep
              record={imports.find((record) => record.id === importId)}
              skipped={skipErrors ? errors : 0}
              fixed={warnings}
              onRestart={restart}
              onHistory={onShowHistory}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

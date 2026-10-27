'use client';

import { ArrowLeft, Check, FileSpreadsheet, FileText, UploadCloud, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Meter } from '@/components/data/meter';
import { Notice } from '@/components/data/states';
import { Segmented } from '@/components/data/segmented';
import type { DataHubData, ImportRecord } from '@/lib/data/types';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

const STEPS = ['Arquivo', 'Colunas', 'Validação', 'Confirmação'] as const;
const DATASETS = ['Vendas', 'Estoque', 'Compras', 'Produtos'] as const;
type Dataset = (typeof DATASETS)[number];
const UNMAPPED = '__none__';

function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Etapas da importação">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="flex flex-col gap-2">
            <span className={cn('h-1 rounded-full transition-colors duration-300', done || active ? 'bg-brand' : 'bg-neutral-soft')} />
            <span className={cn('flex items-center gap-1.5 text-xs', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              <span
                className={cn(
                  'grid size-4.5 place-items-center rounded-full text-[10px] font-semibold',
                  done ? 'bg-brand text-primary-foreground dark:text-background' : active ? 'border border-brand text-brand' : 'border text-subtle-foreground',
                )}
                aria-hidden="true"
              >
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              <span className="hidden sm:inline">{step}</span>
              <span className="sr-only sm:hidden">{step}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ImportWizard({ data, onImported }: { data: DataHubData; onImported: (record: ImportRecord) => void }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [dataset, setDataset] = useState<Dataset>('Vendas');
  const [file, setFile] = useState<{ name: string; size: number; sample: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [skipErrors, setSkipErrors] = useState(true);
  const [mapping, setMapping] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(data.sample.mapping.map((m) => [m.source, m.target])),
  );

  const { sample } = data;
  const mappedTargets = new Set(Object.values(mapping).filter(Boolean));
  const missingRequired = data.targetFields.filter((f) => f.required && !mappedTargets.has(f.id));
  const errors = sample.issues.filter((i) => i.severity === 'error').length;
  const warnings = sample.issues.filter((i) => i.severity === 'warning').length;
  const validRows = sample.totalRows - errors;

  const pick = (chosen: File | null | undefined) => {
    if (!chosen) return;
    const ok = /\.(csv|xlsx|xls)$/i.test(chosen.name);
    if (!ok) {
      toast.error('Formato não aceito', { description: 'Envie um arquivo .csv, .xlsx ou .xls.' });
      return;
    }
    setFile({ name: chosen.name, size: chosen.size, sample: false });
  };

  const reset = () => {
    setStep(0);
    setFile(null);
  };

  const confirm = () => {
    const now = new Date().toISOString();
    onImported({
      id: `imp-${now}`,
      fileName: file?.name ?? sample.fileName,
      format: file?.name.toLowerCase().endsWith('.csv') ?? true ? 'csv' : 'xlsx',
      dataset,
      status: 'processing',
      records: skipErrors ? validRows : sample.totalRows,
      errors: skipErrors ? 0 : errors,
      uploadedAt: now,
      uploadedBy: 'Helena Prado',
      progress: 0.05,
    });
    toast.success('Importação iniciada', { description: 'Ambiente de demonstração: nenhum dado foi enviado ou gravado.' });
    reset();
  };

  return (
    <div className="flex flex-col gap-6">
      <Stepper current={step} />

      {step === 0 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">O que o arquivo contém</span>
            <Segmented value={dataset} onChange={setDataset} label="Tipo de dado" options={DATASETS.map((d) => ({ value: d, label: d }))} />
          </div>

          {!file ? (
            <label
              htmlFor={inputId}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                pick(event.dataTransfer.files[0]);
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
                'focus-within:ring-2 focus-within:ring-ring/60 hover:border-border-strong hover:bg-muted/40',
                dragging && 'border-brand bg-brand-soft',
              )}
            >
              <UploadCloud aria-hidden="true" className={cn('size-7', dragging ? 'text-brand' : 'text-subtle-foreground')} strokeWidth={1.5} />
              <span className="mt-3 text-base font-medium text-foreground">Arraste a planilha aqui ou clique para escolher</span>
              <span className="mt-1 text-sm text-muted-foreground">CSV ou Excel (.xlsx, .xls), até 50 MB</span>
              <span className="mt-4 flex items-center gap-3 text-xs text-subtle-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText aria-hidden="true" className="size-3.5" /> CSV
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileSpreadsheet aria-hidden="true" className="size-3.5" /> Excel
                </span>
              </span>
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="sr-only"
                onChange={(event) => pick(event.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <FileSpreadsheet aria-hidden="true" className="size-5 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.sample ? 'Arquivo de exemplo' : `${formatNumber(Math.max(1, Math.round(file.size / 1024)))} KB`}, {dataset.toLowerCase()}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setFile(null)} aria-label="Remover arquivo">
                <X aria-hidden="true" />
              </Button>
            </div>
          )}

          {file && !file.sample && (
            <Notice title="Pré-visualização com arquivo de exemplo">
              Nesta demonstração o arquivo não é lido nem enviado. As próximas etapas usam uma planilha de exemplo para mostrar o mapeamento e a validação.
            </Notice>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="link" className="px-0" onClick={() => setFile({ name: sample.fileName, size: 0, sample: true })}>
              Usar o arquivo de exemplo
            </Button>
            <Button onClick={() => setStep(1)} disabled={!file}>
              Mapear colunas
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Sugerimos o campo da SOLUS para cada coluna de <span className="font-medium text-foreground">{sample.fileName}</span>. Revise as de menor confiança.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <caption className="sr-only">Mapeamento de colunas</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-muted/50 text-xs">Coluna no arquivo</TableHead>
                  <TableHead className="bg-muted/50 text-xs">Exemplo</TableHead>
                  <TableHead className="bg-muted/50 text-xs">Campo na SOLUS</TableHead>
                  <TableHead className="bg-muted/50 text-right text-xs">Confiança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sample.mapping.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell className="font-medium" translate="no">
                      {row.source}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.sample}</TableCell>
                    <TableCell>
                      <Select
                        value={mapping[row.source] ?? UNMAPPED}
                        onValueChange={(value) => setMapping((m) => ({ ...m, [row.source]: value === UNMAPPED ? null : value }))}
                      >
                        <SelectTrigger size="sm" className="w-52 bg-card" aria-label={`Campo para a coluna ${row.source}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNMAPPED}>Não importar</SelectItem>
                          {data.targetFields.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.label}
                              {field.required ? ' *' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-2">
                        <Meter
                          value={row.confidence}
                          tone={row.confidence >= 0.85 ? 'positive' : row.confidence >= 0.6 ? 'brand' : 'warning'}
                          label={`Confiança de ${formatPercent(row.confidence, 0)}`}
                          className="w-14"
                        />
                        <span className="w-9 text-xs tabular text-muted-foreground">{formatPercent(row.confidence, 0)}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {missingRequired.length > 0 ? (
            <Notice tone="error" title="Faltam campos obrigatórios">
              Associe uma coluna a: {missingRequired.map((f) => f.label).join(', ')}.
            </Notice>
          ) : (
            <Notice tone="success" title="Campos obrigatórios associados">
              Data, SKU, quantidade e preço unitário estão mapeados. Campos marcados com * são obrigatórios.
            </Notice>
          )}
          <details className="group rounded-lg border">
            <summary className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
              Pré-visualizar as primeiras linhas
            </summary>
            <div className="overflow-x-auto border-t">
              <Table>
                <caption className="sr-only">Primeiras linhas do arquivo</caption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {sample.columns.map((column) => (
                      <TableHead key={column} className="text-xs" translate="no">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.rows.map((row, index) => (
                    <TableRow key={index}>
                      {row.map((cell, i) => (
                        <TableCell key={i} className="tabular text-muted-foreground">
                          {cell || <span className="text-critical-text">vazio</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft aria-hidden="true" /> Voltar
            </Button>
            <Button onClick={() => setStep(2)} disabled={missingRequired.length > 0}>
              Validar arquivo
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-4 *:py-3">
            <div>
              <dt className="text-xs text-muted-foreground">Linhas válidas</dt>
              <dd className="mt-0.5 text-xl font-semibold text-positive-text">{formatNumber(validRows)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Avisos</dt>
              <dd className="mt-0.5 text-xl font-semibold text-warning-text">{warnings}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Erros</dt>
              <dd className="mt-0.5 text-xl font-semibold text-critical-text">{errors}</dd>
            </div>
          </dl>
          <ul className="flex flex-col divide-y rounded-lg border">
            {sample.issues.map((issue) => (
              <li key={`${issue.row}-${issue.column}`} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                <Badge variant={issue.severity === 'error' ? 'critical' : 'warning'} className="w-fit shrink-0">
                  {issue.severity === 'error' ? 'Erro' : 'Aviso'}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{issue.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Linha {formatNumber(issue.row)}, coluna <span translate="no">{issue.column}</span>, valor “{issue.value || 'vazio'}”
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <Label htmlFor="skip-errors" className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium text-foreground">Ignorar linhas com erro</span>
              <span className="text-xs font-normal text-muted-foreground">As {errors} linhas ficam fora; os avisos são corrigidos automaticamente.</span>
            </Label>
            <Switch id="skip-errors" checked={skipErrors} onCheckedChange={setSkipErrors} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft aria-hidden="true" /> Voltar
            </Button>
            <Button onClick={() => setStep(3)} disabled={!skipErrors && errors > 0}>
              Revisar importação
            </Button>
          </div>
          {!skipErrors && errors > 0 && (
            <Notice tone="warning" title="Corrija os erros ou ative a opção acima">
              Linhas com SKU vazio ou quantidade negativa não podem entrar nas análises.
            </Notice>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ['Arquivo', file?.name ?? sample.fileName],
              ['Tipo de dado', dataset],
              ['Linhas a importar', formatNumber(skipErrors ? validRows : sample.totalRows)],
              ['Colunas mapeadas', `${mappedTargets.size} de ${sample.columns.length}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border px-4 py-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <Notice title="O que acontece depois">
            Os dados entram nas análises assim que o processamento termina. Você acompanha o status no histórico abaixo.
          </Notice>
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft aria-hidden="true" /> Voltar
            </Button>
            <Button onClick={confirm}>Importar {formatNumber(skipErrors ? validRows : sample.totalRows)} linhas</Button>
          </div>
        </div>
      )}
    </div>
  );
}

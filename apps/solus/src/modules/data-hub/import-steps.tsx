'use client';

import { ArrowLeft, ArrowRight, Check, CircleAlert, FileSpreadsheet, FileText, TriangleAlert, UploadCloud, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Meter } from '@/components/data/meter';
import { Notice } from '@/components/data/states';
import { Segmented } from '@/components/data/segmented';
import type { DataHubData } from '@/lib/data/types';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export const STEPS = ['Arquivo', 'Pré-visualização', 'Mapeamento', 'Validação', 'Confirmação', 'Resultado'] as const;
export const DATASETS = ['Vendas', 'Estoque', 'Compras', 'Produtos'] as const;
export type Dataset = (typeof DATASETS)[number];
export const UNMAPPED = '__none__';

type Sample = DataHubData['sample'];

export interface PickedFile {
  name: string;
  size: number;
  sample: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(bytes / 1_000_000)} MB`;
  return `${formatNumber(Math.max(1, Math.round(bytes / 1000)))} KB`;
}

/** Six labelled steps on wide screens; "Etapa 2 de 6" with a segmented bar on phones. */
export function Stepper({ current }: { current: number }) {
  return (
    <div>
      <p aria-hidden="true" className="mb-2 text-sm font-medium text-foreground md:hidden">
        Etapa {current + 1} de {STEPS.length}: {STEPS[current]}
      </p>
      <ol className="grid grid-cols-6 gap-1.5 md:gap-2" aria-label="Etapas da importação">
        {STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={step} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-col gap-2">
              <span className={cn('h-1 rounded-full transition-colors duration-300', done || active ? 'bg-brand' : 'bg-neutral-soft')} />
              <span className={cn('hidden items-start gap-1.5 text-xs leading-4 md:flex', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                <span
                  className={cn(
                    'grid size-4.5 shrink-0 place-items-center rounded-full text-[10px] font-semibold',
                    done ? 'bg-brand text-primary-foreground dark:text-background' : active ? 'border border-brand text-brand' : 'border text-subtle-foreground',
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check className="size-3" /> : index + 1}
                </span>
                <span className="min-w-0 pt-px">{step}</span>
              </span>
              <span className="sr-only md:hidden">
                {step}
                {done ? ', concluída' : active ? ', etapa atual' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StepActions({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} className="sm:-ml-2.5">
          <ArrowLeft aria-hidden="true" /> Voltar
        </Button>
      ) : (
        <span />
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>
    </div>
  );
}

/* ---------- 1. Arquivo ---------- */

export function FileStep({
  dataset,
  onDataset,
  file,
  error,
  onPick,
  onSample,
  onRemove,
  onNext,
}: {
  dataset: Dataset;
  onDataset: (value: Dataset) => void;
  file: PickedFile | null;
  error: string | null;
  onPick: (file: File | null | undefined) => void;
  onSample: () => void;
  onRemove: () => void;
  onNext: () => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const [dragging, setDragging] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          O que o arquivo contém
        </span>
        <Segmented value={dataset} onChange={onDataset} label="Tipo de dado" options={DATASETS.map((d) => ({ value: d, label: d }))} />
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
            onPick(event.dataTransfer.files[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
            'focus-within:ring-2 focus-within:ring-ring/60 hover:border-border-strong hover:bg-muted/40',
            dragging && 'border-brand bg-brand-soft',
            error && 'border-critical/50',
          )}
        >
          <UploadCloud aria-hidden="true" className={cn('size-7', dragging ? 'text-brand' : 'text-subtle-foreground')} strokeWidth={1.5} />
          <span className="mt-3 text-base font-medium text-foreground">{dragging ? 'Solte para enviar' : 'Arraste a planilha aqui ou clique para escolher'}</span>
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
            id={inputId}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="sr-only"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              onPick(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <FileSpreadsheet aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {file.sample ? 'Arquivo de exemplo' : formatSize(file.size)}, {dataset.toLowerCase()}
            </p>
          </div>
          <Badge variant="positive">
            <Check aria-hidden="true" /> Pronto
          </Badge>
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remover arquivo">
            <X aria-hidden="true" />
          </Button>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="-mt-2 flex items-start gap-2 text-sm text-critical-text">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      {file && !file.sample && (
        <Notice title="Pré-visualização com o arquivo de exemplo">
          Nesta demonstração o arquivo não é lido nem enviado. As próximas etapas usam uma planilha de exemplo de vendas para mostrar a pré-visualização,
          o mapeamento e a validação.
        </Notice>
      )}

      <StepActions>
        {!file && (
          <Button variant="outline" onClick={onSample}>
            <FileSpreadsheet aria-hidden="true" />
            Usar o arquivo de exemplo
          </Button>
        )}
        <Button onClick={onNext} disabled={!file}>
          Pré-visualizar arquivo
          <ArrowRight aria-hidden="true" />
        </Button>
      </StepActions>
    </div>
  );
}

/* ---------- 2. Pré-visualização ---------- */

export function PreviewStep({ sample, fileName, onBack, onNext }: { sample: Sample; fileName: string; onBack: () => void; onNext: () => void }) {
  const flagged = new Map(sample.issues.map((issue) => [`${issue.row}:${issue.column}`, issue]));
  const detected = [
    ['Linhas de dados', formatNumber(sample.totalRows)],
    ['Colunas', String(sample.columns.length)],
    ['Separador', sample.delimiter === ';' ? 'Ponto e vírgula' : 'Vírgula'],
    ['Codificação', sample.encoding],
    ['Período', `${formatDate(sample.firstDate)} a ${formatDate(sample.lastDate)}`],
  ];
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Leitura de <span className="font-medium text-foreground">{fileName}</span>. Confira se as colunas e os valores fazem sentido antes de mapear.
      </p>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-3 *:py-2.5 sm:grid-cols-5">
        {detected.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-lg border">
        <Table scrollLabel="Tabela: primeiras linhas do arquivo">
          <caption className="sr-only">Primeiras linhas do arquivo, com os valores que chamaram atenção marcados</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 bg-muted/40 text-right text-xs text-subtle-foreground">Linha</TableHead>
              {sample.columns.map((column) => (
                <TableHead key={column} className="bg-muted/40 text-xs text-muted-foreground" translate="no">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sample.rows.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="text-right text-xs text-subtle-foreground tabular">{index + 1}</TableCell>
                {row.map((cell, i) => {
                  const issue = flagged.get(`${index + 1}:${sample.columns[i]}`);
                  return (
                    <TableCell
                      key={i}
                      className={cn(
                        'tabular text-muted-foreground',
                        issue?.severity === 'error' && 'bg-critical-soft text-critical-text',
                        issue?.severity === 'warning' && 'bg-warning-soft text-warning-text',
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {issue && <TriangleAlert aria-hidden="true" className="size-3.5" />}
                        {cell || 'vazio'}
                        {issue && <span className="sr-only">, {issue.severity === 'error' ? 'erro' : 'aviso'}: {issue.message}</span>}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-subtle-foreground">
        <TriangleAlert aria-hidden="true" className="size-3.5" />
        Valores marcados serão detalhados na validação. Mostrando {sample.rows.length} de {formatNumber(sample.totalRows)} linhas.
      </p>
      <StepActions onBack={onBack}>
        <Button onClick={onNext}>
          Mapear colunas
          <ArrowRight aria-hidden="true" />
        </Button>
      </StepActions>
    </div>
  );
}

/* ---------- 3. Mapeamento ---------- */

export function MappingStep({
  sample,
  targetFields,
  mapping,
  onMap,
  onBack,
  onNext,
}: {
  sample: Sample;
  targetFields: DataHubData['targetFields'];
  mapping: Record<string, string | null>;
  onMap: (source: string, target: string | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const targets = Object.values(mapping).filter((value): value is string => Boolean(value));
  const missingRequired = targetFields.filter((field) => field.required && !targets.includes(field.id));
  const duplicated = targetFields.filter((field) => targets.filter((t) => t === field.id).length > 1);
  const blocked = missingRequired.length > 0 || duplicated.length > 0;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        A SOLUS sugeriu um campo para cada coluna de <span className="font-medium text-foreground">{sample.fileName}</span>. Revise as de menor
        confiança; campos com * são obrigatórios.
      </p>
      <div className="rounded-lg border">
        <Table scrollLabel="Tabela: mapeamento das colunas">
          <caption className="sr-only">Mapeamento das colunas do arquivo para os campos da SOLUS</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="bg-muted/40 text-xs text-muted-foreground">Coluna no arquivo</TableHead>
              <TableHead className="bg-muted/40 text-xs text-muted-foreground">Exemplo</TableHead>
              <TableHead className="bg-muted/40 text-xs text-muted-foreground">Campo na SOLUS</TableHead>
              <TableHead className="bg-muted/40 text-right text-xs text-muted-foreground">Confiança da sugestão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sample.mapping.map((row) => {
              const target = mapping[row.source] ?? null;
              const isDuplicate = target !== null && duplicated.some((field) => field.id === target);
              return (
                <TableRow key={row.source}>
                  <TableCell className="font-medium" translate="no">
                    {row.source}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">{row.sample}</TableCell>
                  <TableCell>
                    <Select value={target ?? UNMAPPED} onValueChange={(value) => onMap(row.source, value === UNMAPPED ? null : value)}>
                      <SelectTrigger
                        size="sm"
                        className={cn('w-56 bg-card', isDuplicate && 'border-critical/60')}
                        aria-label={`Campo para a coluna ${row.source}`}
                        aria-invalid={isDuplicate || undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNMAPPED}>Não importar</SelectItem>
                        {targetFields.map((field) => (
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
              );
            })}
          </TableBody>
        </Table>
      </div>
      {missingRequired.length > 0 ? (
        <Notice tone="error" title="Faltam campos obrigatórios">
          Associe uma coluna a: {missingRequired.map((f) => f.label).join(', ')}.
        </Notice>
      ) : duplicated.length > 0 ? (
        <Notice tone="error" title="Campo usado mais de uma vez">
          {duplicated.map((f) => f.label).join(', ')} recebe mais de uma coluna. Escolha uma e marque a outra como Não importar.
        </Notice>
      ) : (
        <Notice tone="success" title="Campos obrigatórios associados">
          Data, código do produto, quantidade e preço unitário estão mapeados.
        </Notice>
      )}
      <StepActions onBack={onBack}>
        <Button onClick={onNext} disabled={blocked}>
          Validar arquivo
          <ArrowRight aria-hidden="true" />
        </Button>
      </StepActions>
    </div>
  );
}

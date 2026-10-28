'use client';

import { ArrowRight, Check, CircleAlert, FileSpreadsheet, FileText, Loader2, TriangleAlert, UploadCloud, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Meter } from '@/components/data/meter';
import { Notice } from '@/components/data/states';
import { Segmented } from '@/components/data/segmented';
import { ENCODING_LABEL } from '@/lib/ingest/decode';
import { DATASET_DESCRIPTION, DATASET_LABEL, fieldsOf } from '@/lib/ingest/fields';
import { cellText } from '@/lib/ingest/normalize';
import type { Dataset, Mapping, ParsedTable, ReadOptions } from '@/lib/ingest/types';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { formatSize, StepActions, UNMAPPED } from '../import-steps';
import type { LoadedFile } from './read-file';

const DATASETS: Dataset[] = ['sales', 'products', 'inventory', 'suppliers'];
const DELIMITER: Record<string, string> = { ';': 'Ponto e vírgula', ',': 'Vírgula', '\t': 'Tabulação', '|': 'Barra vertical' };

export interface Busy {
  label: string;
  progress: number | null;
}

export function BusyLine({ busy }: { busy: Busy }) {
  return (
    <div role="status" className="flex flex-col gap-2 rounded-lg border px-4 py-3">
      <p className="flex items-center gap-2 text-sm text-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin text-brand" />
        {busy.label}
      </p>
      {busy.progress !== null && <Meter value={busy.progress} label={`${formatPercent(busy.progress, 0)} concluído`} />}
    </div>
  );
}

/* ---------- 1. Arquivo ---------- */

export function FileStep({
  dataset,
  onDataset,
  loaded,
  uploaded,
  busy,
  error,
  onPick,
  onRemove,
  onUpload,
}: {
  dataset: Dataset;
  onDataset: (value: Dataset) => void;
  loaded: LoadedFile | null;
  uploaded: boolean;
  busy: Busy | null;
  error: string | null;
  onPick: (file: File) => void;
  onRemove: () => void;
  onUpload: () => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const [dragging, setDragging] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">O que o arquivo contém</span>
        <Segmented
          value={dataset}
          onChange={(value) => !uploaded && onDataset(value)}
          label="Tipo de dado"
          options={DATASETS.map((value) => ({ value, label: DATASET_LABEL[value] }))}
        />
        <p className="text-sm text-muted-foreground">{DATASET_DESCRIPTION[dataset]}</p>
      </div>

      {!loaded ? (
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
            const file = event.dataTransfer.files[0];
            if (file) onPick(file);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
            'focus-within:ring-2 focus-within:ring-ring/60 hover:border-border-strong hover:bg-muted/40',
            dragging && 'border-brand bg-brand-soft',
            error && 'border-critical/50',
          )}
        >
          <UploadCloud aria-hidden="true" className={cn('size-7', dragging ? 'text-brand' : 'text-subtle-foreground')} strokeWidth={1.5} />
          <span className="mt-3 text-base font-medium text-foreground">{dragging ? 'Solte para ler o arquivo' : 'Arraste a planilha aqui ou clique para escolher'}</span>
          <span className="mt-1 text-sm text-muted-foreground">CSV ou Excel (.xlsx), até 25 MB e 200 mil linhas</span>
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
            accept=".csv,.txt,.tsv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            disabled={busy !== null}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPick(file);
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
            <p className="truncate text-sm font-medium text-foreground">{loaded.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(loaded.file.size)}, {loaded.format === 'csv' ? 'CSV' : 'Excel'}, {DATASET_LABEL[dataset].toLowerCase()}
            </p>
          </div>
          <Badge variant={uploaded ? 'positive' : 'neutral'}>
            <Check aria-hidden="true" /> {uploaded ? 'Enviado' : 'Lido'}
          </Badge>
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remover arquivo" disabled={busy !== null}>
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
      {busy && <BusyLine busy={busy} />}

      <p className="text-xs text-subtle-foreground">
        O arquivo é lido no seu navegador e enviado sem passar pelo servidor da aplicação para um armazenamento privado desta organização. O servidor
        confere a impressão digital (SHA-256) do arquivo guardado e valida cada linha de novo.
      </p>

      <StepActions>
        <Button onClick={onUpload} disabled={!loaded || busy !== null}>
          {uploaded ? 'Pré-visualizar' : 'Enviar e pré-visualizar'}
          <ArrowRight aria-hidden="true" />
        </Button>
      </StepActions>
    </div>
  );
}

/* ---------- 2. Pré-visualização ---------- */

export function PreviewStep({
  loaded,
  table,
  sheet,
  onSheet,
  previous,
  onBack,
  onNext,
}: {
  loaded: LoadedFile;
  table: ParsedTable;
  sheet: string | null;
  onSheet: (name: string) => void;
  previous: { at: string; status: string } | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const detected: [string, string][] = [
    ['Linhas de dados', formatNumber(table.rows.length)],
    ['Colunas', String(table.headers.length)],
    ...(loaded.format === 'csv'
      ? ([
          ['Separador', DELIMITER[loaded.delimiter ?? ''] ?? (loaded.delimiter || '—')],
          ['Codificação', loaded.encoding ? ENCODING_LABEL[loaded.encoding] : '—'],
        ] as [string, string][])
      : ([['Abas com dados', String(loaded.sheets.length)]] as [string, string][])),
  ];
  const sample = table.rows.slice(0, 15);
  return (
    <div className="flex flex-col gap-5">
      {previous && (
        <Notice tone="warning" title="Este mesmo arquivo já foi importado">
          Uma importação com conteúdo idêntico foi registrada em {formatDateTime(previous.at)}. Você pode continuar: na validação, as linhas que já
          estão nos dados aparecem como duplicatas e não são gravadas de novo sem a sua confirmação.
        </Notice>
      )}
      {loaded.format === 'xlsx' && loaded.sheets.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="aba" className="text-sm font-medium text-foreground">
            Aba
          </label>
          <Select value={sheet ?? loaded.sheets[0]!.name} onValueChange={onSheet}>
            <SelectTrigger id="aba" className="w-60 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {loaded.sheets.map((item) => (
                <SelectItem key={item.name} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-3 *:py-2.5 sm:grid-cols-4">
        {detected.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-lg border">
        <Table scrollLabel="Tabela: primeiras linhas do arquivo">
          <caption className="sr-only">Primeiras linhas do arquivo, como foram lidas</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14 bg-muted/40 text-right text-xs text-subtle-foreground">Linha</TableHead>
              {table.headers.map((header) => (
                <TableHead key={header} className="bg-muted/40 text-xs text-muted-foreground" translate="no">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sample.map((row) => (
              <TableRow key={row.line}>
                <TableCell className="text-right text-xs text-subtle-foreground tabular">{row.line}</TableCell>
                {row.cells.map((cell, index) => (
                  <TableCell key={index} className="max-w-56 truncate tabular text-muted-foreground">
                    {cellText(cell) || <span className="text-subtle-foreground">vazio</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-subtle-foreground">
        Mostrando {sample.length} de {formatNumber(table.rows.length)} linhas. Linhas totalmente vazias são ignoradas; a numeração é a do arquivo.
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
  dataset,
  table,
  mapping,
  confidence,
  options,
  problems,
  busy,
  error,
  onMap,
  onOptions,
  onBack,
  onNext,
}: {
  dataset: Dataset;
  table: ParsedTable;
  mapping: Mapping;
  confidence: Record<string, number>;
  options: ReadOptions;
  problems: string[];
  busy: Busy | null;
  error: string | null;
  onMap: (column: number, field: string | null) => void;
  onOptions: (options: ReadOptions) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const fields = fieldsOf(dataset);
  const fieldOf = (column: number) => Object.entries(mapping).find(([, value]) => value === column)?.[0] ?? null;
  const sampleOf = (column: number) => cellText(table.rows.find((row) => cellText(row.cells[column] ?? null) !== '')?.cells[column] ?? null);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        A SOLUS sugeriu um campo para as colunas que reconheceu. Revise as de menor confiança; campos com * são obrigatórios. Colunas sem campo não são
        importadas.
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
            {table.headers.map((header, column) => {
              const field = fieldOf(column);
              const score = field ? confidence[field] : undefined;
              return (
                <TableRow key={header}>
                  <TableCell className="font-medium" translate="no">
                    {header}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">{sampleOf(column) || 'vazio'}</TableCell>
                  <TableCell>
                    <Select value={field ?? UNMAPPED} onValueChange={(value) => onMap(column, value === UNMAPPED ? null : value)}>
                      <SelectTrigger size="sm" className="w-60 bg-card" aria-label={`Campo para a coluna ${header}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNMAPPED}>Não importar</SelectItem>
                        {fields.map((item) => (
                          <SelectItem key={item.key} value={item.key}>
                            {item.label}
                            {item.required ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    {score !== undefined ? (
                      <span className="inline-flex items-center gap-2">
                        <Meter value={score} tone={score >= 0.85 ? 'positive' : score >= 0.6 ? 'brand' : 'warning'} label={`Confiança de ${formatPercent(score, 0)}`} className="w-14" />
                        <span className="w-9 text-xs tabular text-muted-foreground">{formatPercent(score, 0)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-subtle-foreground">{field ? 'manual' : '—'}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <fieldset className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm font-medium text-foreground">Como ler os valores</legend>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="decimal" className="text-xs text-muted-foreground">
            Números
          </label>
          <Select value={options.decimal} onValueChange={(value) => onOptions({ ...options, decimal: value as ReadOptions['decimal'] })}>
            <SelectTrigger id="decimal" className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="br">Brasileiro: 1.250,50</SelectItem>
              <SelectItem value="us">Internacional: 1,250.50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="datas" className="text-xs text-muted-foreground">
            Datas
          </label>
          <Select value={options.dateOrder} onValueChange={(value) => onOptions({ ...options, dateOrder: value as ReadOptions['dateOrder'] })}>
            <SelectTrigger id="datas" className="bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dmy">Dia/mês/ano: 31/01/2026</SelectItem>
              <SelectItem value="mdy">Mês/dia/ano: 01/31/2026</SelectItem>
              <SelectItem value="ymd">Ano-mês-dia: 2026-01-31</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {dataset === 'inventory' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contagem" className="text-xs text-muted-foreground">
              Data da contagem (se o arquivo não tiver)
            </label>
            <Input
              id="contagem"
              type="date"
              className="bg-card"
              value={options.snapshotDate ?? ''}
              onChange={(event) => onOptions({ ...options, snapshotDate: event.target.value || null })}
            />
          </div>
        )}
      </fieldset>

      {problems.length > 0 ? (
        <Notice tone="error" title="Ajuste o mapeamento para continuar">
          <ul className="mt-1 flex flex-col gap-1">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Notice>
      ) : (
        <Notice tone="success" title="Campos obrigatórios associados">
          A validação lê todas as {formatNumber(table.rows.length)} linhas no servidor, com as regras acima.
        </Notice>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-critical-text">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      {busy && <BusyLine busy={busy} />}
      <StepActions onBack={busy ? undefined : onBack}>
        <Button onClick={onNext} disabled={problems.length > 0 || busy !== null}>
          Validar no servidor
          <ArrowRight aria-hidden="true" />
        </Button>
      </StepActions>
    </div>
  );
}

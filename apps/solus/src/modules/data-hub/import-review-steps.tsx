'use client';

import { AppLink as Link } from '@/components/shell/base-path';
import { ArrowRight, Check, CircleAlert, Loader2, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Meter } from '@/components/data/meter';
import { Notice } from '@/components/data/states';
import { Segmented } from '@/components/data/segmented';
import type { DataHubData, ImportRecord } from '@/lib/data/types';
import { formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StepActions } from './import-steps';

type Sample = DataHubData['sample'];

/* ---------- 4. Validação ---------- */

export function ValidationStep({
  sample,
  skipErrors,
  onSkipErrors,
  onBack,
  onNext,
}: {
  sample: Sample;
  skipErrors: boolean;
  onSkipErrors: (value: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');
  const errors = sample.issues.filter((i) => i.severity === 'error').length;
  const warnings = sample.issues.filter((i) => i.severity === 'warning').length;
  const validating = progress < 1;

  // Demo only: the check runs in the browser over the sample; the real one runs on the server.
  useEffect(() => {
    const timer = window.setInterval(() => setProgress((p) => Math.min(1, p + 0.18)), 180);
    return () => window.clearInterval(timer);
  }, []);

  if (validating) {
    return (
      <div role="status" className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <Loader2 aria-hidden="true" className="size-6 animate-spin text-brand" />
        <div>
          <p className="text-base font-medium text-foreground">Validando {formatNumber(sample.totalRows)} linhas…</p>
          <p className="mt-1 text-sm text-muted-foreground">Formatos de data e número, códigos de produto e valores fora do esperado.</p>
        </div>
        <Meter value={progress} label="Progresso da validação" className="w-64 max-w-full" />
      </div>
    );
  }

  const visible = sample.issues.filter((issue) => filter === 'all' || issue.severity === filter);
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-4 *:py-3">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check aria-hidden="true" className="size-3.5 text-positive-text" /> Linhas válidas
          </dt>
          <dd className="mt-0.5 text-xl font-semibold text-foreground tabular">{formatNumber(sample.totalRows - errors)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" /> Avisos
          </dt>
          <dd className="mt-0.5 text-xl font-semibold text-foreground tabular">{warnings}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleAlert aria-hidden="true" className="size-3.5 text-critical-text" /> Erros
          </dt>
          <dd className="mt-0.5 text-xl font-semibold text-foreground tabular">{errors}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-3">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          label="Filtrar problemas"
          options={[
            { value: 'all', label: 'Todos', count: sample.issues.length },
            { value: 'error', label: 'Erros', count: errors },
            { value: 'warning', label: 'Avisos', count: warnings },
          ]}
        />
        <ul className="flex flex-col divide-y rounded-lg border">
          {visible.map((issue) => (
            <li key={`${issue.row}-${issue.column}`} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
              <Badge variant={issue.severity === 'error' ? 'critical' : 'warning'} className="w-fit shrink-0">
                {issue.severity === 'error' ? <CircleAlert aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
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
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
        <Label htmlFor="skip-errors" className="flex flex-col items-start gap-0.5">
          <span className="text-sm font-medium text-foreground">Ignorar linhas com erro</span>
          <span className="text-xs font-normal text-muted-foreground">
            As {errors} linhas com erro ficam fora. Os {warnings} avisos são corrigidos automaticamente.
          </span>
        </Label>
        <Switch id="skip-errors" checked={skipErrors} onCheckedChange={onSkipErrors} />
      </div>
      {!skipErrors && errors > 0 && (
        <Notice tone="warning" title="Corrija os erros ou ative a opção acima">
          Linhas com código de produto vazio ou quantidade negativa não podem entrar nas análises. Corrija na planilha e envie de novo, ou ignore essas
          linhas.
        </Notice>
      )}
      <StepActions onBack={onBack}>
        <Button onClick={onNext} disabled={!skipErrors && errors > 0}>
          Revisar importação
          <ArrowRight aria-hidden="true" />
        </Button>
      </StepActions>
    </div>
  );
}

/* ---------- 5. Confirmação ---------- */

export function ConfirmStep({
  rows,
  onBack,
  onConfirm,
}: {
  rows: [string, string][];
  onBack: () => void;
  onConfirm: () => void;
}) {
  const importing = rows.find(([label]) => label === 'Linhas a importar')?.[1] ?? '';
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-4 *:py-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <Notice title="O que acontece depois">
        As linhas são gravadas e as análises de vendas, margem e estoque são atualizadas. Você acompanha o processamento na próxima etapa e no histórico.
      </Notice>
      <StepActions onBack={onBack}>
        <Button onClick={onConfirm}>Importar {importing} linhas</Button>
      </StepActions>
    </div>
  );
}

/* ---------- 6. Resultado ---------- */

const STAGES = ['Enviando o arquivo', 'Gravando as linhas', 'Atualizando as análises'];

export function ResultStep({
  record,
  skipped,
  fixed,
  onRestart,
  onHistory,
}: {
  record: ImportRecord | undefined;
  skipped: number;
  fixed: number;
  onRestart: () => void;
  onHistory: () => void;
}) {
  const progress = record?.progress ?? 0;
  const done = record !== undefined && record.status !== 'processing';
  if (!done) {
    const stage = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length));
    return (
      <div role="status" className="flex flex-col gap-5 rounded-xl border px-5 py-6">
        <div className="flex items-center gap-3">
          <Loader2 aria-hidden="true" className="size-5 animate-spin text-brand" />
          <div>
            <p className="text-base font-medium text-foreground">Importando {record?.fileName}…</p>
            <p className="text-sm text-muted-foreground">Você pode sair desta tela: o processamento continua e aparece no histórico.</p>
          </div>
        </div>
        <Meter value={progress} label={`Importação ${formatPercent(progress, 0)} concluída`} />
        <ol className="flex flex-col gap-1.5 text-sm">
          {STAGES.map((label, index) => (
            <li key={label} className={cn('flex items-center gap-2', index > stage ? 'text-subtle-foreground' : 'text-muted-foreground')}>
              {index < stage ? (
                <Check aria-hidden="true" className="size-3.5 text-positive-text" />
              ) : index === stage ? (
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin text-brand" />
              ) : (
                <span aria-hidden="true" className="size-3.5" />
              )}
              {label}
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <div role="status" className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-positive/30 bg-positive-soft px-5 py-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-positive text-white dark:text-background">
          <Check aria-hidden="true" className="size-4.5" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">Importação concluída</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {record?.fileName} entrou nas análises. Demonstração: nenhum dado foi enviado ou gravado de verdade.
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-4 *:py-3">
        <div>
          <dt className="text-xs text-muted-foreground">Linhas importadas</dt>
          <dd className="mt-0.5 text-xl font-semibold text-foreground tabular">{formatNumber(record?.records ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Linhas ignoradas</dt>
          <dd className="mt-0.5 text-xl font-semibold text-foreground tabular">{skipped}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Avisos corrigidos</dt>
          <dd className="mt-0.5 text-xl font-semibold text-foreground tabular">{fixed}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onHistory} className="sm:-ml-2.5">
          Ver no histórico
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onRestart}>
            Nova importação
          </Button>
          <Button asChild>
            <Link href="/visao-geral">
              Ir para a visão executiva
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

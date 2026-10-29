'use client';

import Link from 'next/link';
import { ArrowRight, CircleAlert, CircleCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/data/states';
import { DATASET_LABEL } from '@/lib/ingest/fields';
import type { Dataset } from '@/lib/ingest/types';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ImportRecordRow, IssueGroup } from '@/services/imports';
import type { FinishedImport } from '../actions';
import { StepActions } from '../import-steps';
import { IssueGroups, IssueList } from './issues';
import { BusyLine, type Busy } from './source-steps';

export type Policy = 'skip' | 'keep' | 'replace' | 'update';

function Figures({ items }: { items: [string, string, ('critical' | 'warning' | 'positive')?][] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-3 *:py-2.5 sm:grid-cols-4">
      {items.map(([label, value, tone]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd
            className={cn(
              'mt-0.5 text-base font-semibold tabular text-foreground',
              tone === 'critical' && 'text-critical-text',
              tone === 'warning' && 'text-warning-text',
              tone === 'positive' && 'text-positive-text',
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const num = (value: unknown) => (typeof value === 'number' ? value : Number(value ?? 0));

/* ---------- 4. Validação ---------- */

export function ValidationStep({
  record,
  issues,
  busy,
  error,
  onBack,
  onNext,
  onRestart,
}: {
  record: ImportRecordRow | null;
  issues: IssueGroup[];
  busy: Busy | null;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  if (!record || busy) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">Cada linha é lida de novo no servidor, com as mesmas regras, antes de qualquer gravação.</p>
        {busy && <BusyLine busy={busy} />}
        {error && (
          <Notice tone="error" title="A validação parou" action={<Button variant="outline" size="sm" onClick={onBack}>Voltar ao mapeamento</Button>}>
            {error}
          </Notice>
        )}
      </div>
    );
  }

  const failed = record.status === 'failed';
  return (
    <div className="flex flex-col gap-5">
      <Figures
        items={[
          ['Linhas lidas', formatNumber(record.totalRows)],
          ['Prontas para importar', formatNumber(record.validRows), 'positive'],
          ['Rejeitadas (erro)', formatNumber(record.errorCount), record.errorCount > 0 ? 'critical' : undefined],
          ['Avisos', formatNumber(record.warningCount), record.warningCount > 0 ? 'warning' : undefined],
        ]}
      />
      {failed ? (
        <Notice tone="error" title="Nenhuma linha válida">
          Todas as linhas têm erro. Confira o mapeamento e o formato dos números e das datas, ou corrija o arquivo e envie de novo.
        </Notice>
      ) : record.errorCount > 0 ? (
        <Notice tone="warning" title="Linhas com erro não serão importadas">
          As demais seguem para a confirmação. Corrija as linhas listadas no arquivo e importe-as depois, se precisar delas.
        </Notice>
      ) : (
        <Notice tone="success" title="Nenhuma linha rejeitada">
          {record.warningCount > 0 ? 'Os avisos abaixo descrevem ajustes feitos na leitura.' : 'Todas as linhas passaram pela validação.'}
        </Notice>
      )}
      <IssueGroups groups={issues} />
      {issues.length > 0 && (
        <details className="rounded-lg border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Ver todos os problemas, linha a linha</summary>
          <div className="mt-3">
            <IssueList importId={record.id} />
          </div>
        </details>
      )}
      <StepActions onBack={onBack}>
        {failed ? (
          <Button onClick={onRestart}>
            <RotateCcw aria-hidden="true" />
            Começar de novo
          </Button>
        ) : (
          <Button onClick={onNext}>
            Revisar e confirmar
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </StepActions>
    </div>
  );
}

/* ---------- 5. Confirmação ---------- */

function summaryRows(dataset: Dataset, summary: Record<string, unknown>): [string, string][] {
  const period = summary.periodStart ? `${formatDate(String(summary.periodStart))} a ${formatDate(String(summary.periodEnd))}` : '—';
  if (dataset === 'sales') {
    return [
      ['Período das vendas', period],
      ['Itens de venda', formatNumber(num(summary.saleLines))],
      ['Itens de devolução', formatNumber(num(summary.returnLines))],
      ['Receita bruta no arquivo', formatCurrency(num(summary.grossRevenue))],
      ['Descontos', formatCurrency(num(summary.discounts))],
      ['Devoluções', formatCurrency(num(summary.returnsValue))],
      ['Vendas identificadas (pedidos)', formatNumber(num(summary.orders))],
      ['Linhas sem nº de pedido', formatNumber(num(summary.linesWithoutOrder))],
      ['SKUs sem cadastro (serão criados)', formatNumber(num(summary.newSkus))],
      ['Linhas sem custo conhecido', formatNumber(num(summary.linesWithoutCost))],
    ];
  }
  if (dataset === 'products') {
    return [
      ['Produtos novos', formatNumber(num(summary.newProducts))],
      ['Produtos atualizados', formatNumber(num(summary.updatedProducts))],
      ['Custos alterados', formatNumber(num(summary.costChanges))],
      ['Sem custo', formatNumber(num(summary.withoutCost))],
      ['Categorias novas', formatNumber(num(summary.newCategories))],
      ['Fornecedores novos', formatNumber(num(summary.newSuppliers))],
    ];
  }
  if (dataset === 'inventory') {
    return [
      ['Data da posição', summary.firstDate === summary.lastDate ? formatDate(String(summary.firstDate)) : `${formatDate(String(summary.firstDate))} a ${formatDate(String(summary.lastDate))}`],
      ['Produtos', formatNumber(num(summary.distinctSkus))],
      ['SKUs sem cadastro (serão criados)', formatNumber(num(summary.newSkus))],
      ['Valor a custo estimado', formatCurrency(num(summary.stockValue))],
      ['Linhas com estoque negativo', formatNumber(num(summary.negativeRows))],
      ['Sem custo', formatNumber(num(summary.withoutCost))],
    ];
  }
  return [
    ['Fornecedores novos', formatNumber(num(summary.newSuppliers))],
    ['Fornecedores atualizados', formatNumber(num(summary.updatedSuppliers))],
  ];
}

export function ConfirmStep({
  record,
  policy,
  onPolicy,
  onBack,
  onConfirm,
  onCancel,
}: {
  record: ImportRecordRow;
  policy: Policy;
  onPolicy: (policy: Policy) => void;
  onBack: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const summary = record.summary;
  const exact = num(summary.exactDuplicates) + num(summary.orderDuplicates);
  const possible = num(summary.possibleDuplicates);
  const existing = num(summary.existingPositions);
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-4 *:py-2.5 sm:grid-cols-2">
        {[['Arquivo', record.fileName], ['Tipo de dado', DATASET_LABEL[record.dataset]], ['Linhas a gravar', formatNumber(record.validRows)], ...summaryRows(record.dataset, summary)].map(
          ([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium tabular text-foreground">{value}</dd>
            </div>
          ),
        )}
      </dl>

      {record.dataset === 'sales' && exact > 0 && (
        <Notice title={`${formatNumber(exact)} linhas já estão nos dados e serão ignoradas`}>
          Mesmo pedido e mesmo conteúdo, ou pedido já importado por outro arquivo. Para corrigir um pedido, desfaça a importação original e importe de novo.
        </Notice>
      )}
      {record.dataset === 'sales' && possible > 0 && (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-warning/40 p-4">
          <legend className="px-1 text-sm font-medium text-foreground">{formatNumber(possible)} linhas sem nº de pedido são idênticas a vendas já importadas</legend>
          <p className="text-sm text-muted-foreground">Sem número de pedido não há como ter certeza: podem ser a mesma venda ou vendas diferentes iguais.</p>
          <PolicyOption value="skip" current={policy} onChange={onPolicy} label="Ignorar essas linhas (recomendado)" />
          <PolicyOption value="keep" current={policy} onChange={onPolicy} label="Importar mesmo assim: são vendas diferentes" />
        </fieldset>
      )}
      {record.dataset === 'inventory' && existing > 0 && (
        <fieldset className="flex flex-col gap-2 rounded-lg border border-warning/40 p-4">
          <legend className="px-1 text-sm font-medium text-foreground">{formatNumber(existing)} posições já existem para o mesmo produto e data</legend>
          <PolicyOption value="skip" current={policy} onChange={onPolicy} label="Manter as posições atuais" />
          <PolicyOption value="replace" current={policy} onChange={onPolicy} label="Usar as deste arquivo (desfazer esta importação traz as atuais de volta)" />
        </fieldset>
      )}
      {(record.dataset === 'products' || record.dataset === 'suppliers') && (
        <Notice title="Cadastros existentes são atualizados">
          Campos vazios no arquivo não apagam o que já existe. Mudar o custo de um produto não altera o custo de vendas já importadas.
        </Notice>
      )}

      <StepActions onBack={onBack}>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar importação
        </Button>
        <Button onClick={onConfirm}>
          Confirmar e gravar
          <ArrowRight aria-hidden="true" />
        </Button>
      </StepActions>
    </div>
  );
}

function PolicyOption({ value, current, onChange, label }: { value: Policy; current: Policy; onChange: (value: Policy) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
      <input type="radio" name="duplicatas" value={value} checked={current === value} onChange={() => onChange(value)} className="size-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}

/* ---------- 6. Processamento ---------- */

export function ProcessingStep({ busy, error, onRetry, onCancel }: { busy: Busy | null; error: string | null; onRetry: () => void; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Gravando em lotes. Se a conexão cair, nada é duplicado: ao continuar, só os lotes que faltam são gravados. Os dados só entram nos painéis quando
        a importação termina.
      </p>
      {busy && <BusyLine busy={busy} />}
      {error && (
        <Notice
          tone="error"
          title="A gravação foi interrompida"
          action={
            <span className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
              <Button size="sm" onClick={onRetry}>
                Continuar
              </Button>
            </span>
          }
        >
          {error}
        </Notice>
      )}
    </div>
  );
}

/* ---------- 7. Resultado ---------- */

export function ResultStep({ result, onRestart, onHistory }: { result: FinishedImport; onRestart: () => void; onHistory: () => void }) {
  const ok = result.status === 'completed';
  const analysis = result.analysis;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        {ok ? <CircleCheck aria-hidden="true" className="mt-0.5 size-6 text-positive-text" /> : <CircleAlert aria-hidden="true" className="mt-0.5 size-6 text-warning-text" />}
        <div>
          <p className="text-lg font-semibold text-foreground">{ok ? 'Importação concluída' : 'Importação concluída com linhas rejeitadas'}</p>
          <p className="text-sm text-muted-foreground">
            {result.inserted > 0 ? 'Os painéis já usam os dados novos.' : 'Nada novo foi gravado: as linhas válidas já estavam nos dados.'}
          </p>
        </div>
      </div>
      <Figures
        items={[
          ['Registros gravados', formatNumber(result.inserted), 'positive'],
          ['Ignorados (duplicados)', formatNumber(result.skipped)],
          ['Rejeitados (erro)', formatNumber(result.rejected), result.rejected > 0 ? 'critical' : undefined],
          ['Oportunidades ativas', analysis.ok ? formatNumber(analysis.detected) : '—'],
        ]}
      />
      {analysis.ok ? (
        <Notice tone="success" title="Oportunidades recalculadas">
          {analysis.created > 0 ? `${analysis.created} novas oportunidades. ` : 'Nenhuma oportunidade nova. '}
          {analysis.resolved > 0 && `${analysis.resolved} deixaram de aparecer nos dados e foram resolvidas. `}
          {analysis.limitations.length > 0 && `${analysis.limitations.length} limitações registradas na Central de Oportunidades.`}
        </Notice>
      ) : (
        <Notice tone="warning" title="As oportunidades não foram recalculadas">
          {analysis.reason === 'not_configured'
            ? 'O servidor não tem a chave secreta do Supabase configurada (SUPABASE_SECRET_KEY). Os dados foram importados; a análise roda quando ela for configurada.'
            : 'A análise falhou. Os dados foram importados; use "Analisar de novo" na Central de Oportunidades.'}
        </Notice>
      )}
      <StepActions>
        <Button variant="ghost" onClick={onHistory}>
          Ver histórico
        </Button>
        <Button variant="outline" onClick={onRestart}>
          Importar outro arquivo
        </Button>
        <Button asChild>
          <Link href="/visao-geral">
            Ver os painéis
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </StepActions>
    </div>
  );
}

'use client';

import { ArrowRight, Database, ListChecks } from 'lucide-react';
import { OPPORTUNITY_CATEGORY, OPPORTUNITY_STATUS, PriorityMark, StatusBadge } from '@/components/data/status';
import type { Opportunity, OpportunityStatus } from '@/lib/data/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ConfidenceMeter } from './confidence';
import { impactShort } from './impact';

/** "Desde 4 ago" reads as "desde 4 ago" mid-sentence; "R$ 3.447" and "SKU" stay as written. */
function lowerFirst(text: string): string {
  return /^[A-ZÀ-Ú][a-zà-ú]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/**
 * One opportunity at a glance: what it is, what it may be worth (an estimate),
 * how sure the analysis is, the strongest piece of evidence and the first
 * action. The title is the single control; the whole card is its hit area.
 */
export function OpportunityCard({
  opportunity,
  rank,
  status,
  selected,
  onOpen,
}: {
  opportunity: Opportunity;
  rank: number | null;
  status: OpportunityStatus;
  selected: boolean;
  onOpen: () => void;
}) {
  const impact = impactShort(opportunity);
  const fact = opportunity.evidence.find((item) => item.basis !== 'estimate');
  const titleId = `cartao-${opportunity.id}`;
  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'surface group relative flex h-full flex-col rounded-xl p-5 transition-[border-color,box-shadow] duration-150',
        'hover:border-border-strong hover:shadow-raised focus-within:ring-2 focus-within:ring-ring/60',
        selected && 'border-brand/50',
      )}
    >
      <div className="flex items-center gap-2.5">
        {rank !== null && (
          <span
            className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-soft text-xs font-semibold text-brand tabular"
            aria-label={`Posição ${rank} na fila de prioridade`}
          >
            {rank}
          </span>
        )}
        <span className="text-xs font-medium text-muted-foreground">{OPPORTUNITY_CATEGORY[opportunity.category]}</span>
        <StatusBadge spec={OPPORTUNITY_STATUS[status]} className="ml-auto" />
      </div>

      <h3 id={titleId} className="mt-3 text-base leading-6 font-semibold tracking-[-0.01em] text-foreground">
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className="text-left outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
        >
          {opportunity.title}
        </button>
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{opportunity.summary}</p>

      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-muted/60 px-3 py-2.5 dark:bg-white/[0.03]">
        <div className="min-w-0">
          <dt className="text-2xs text-subtle-foreground">Impacto estimado</dt>
          <dd className="mt-0.5 text-sm font-semibold whitespace-nowrap text-foreground tabular">
            {impact.value} <span className="text-xs font-normal text-subtle-foreground">{impact.suffix}</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-subtle-foreground">Prioridade</dt>
          <dd className="mt-1">
            <PriorityMark priority={opportunity.priority} short />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-2xs text-subtle-foreground">Confiança</dt>
          <dd className="mt-1.5">
            <ConfidenceMeter value={opportunity.confidence} />
          </dd>
        </div>
      </dl>

      <dl className="mt-4 flex flex-col gap-2.5 text-sm">
        {fact && (
          <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2.5">
            <dt className="pt-0.5">
              <Database aria-hidden="true" className="size-4 text-subtle-foreground" />
              <span className="sr-only">Evidência principal</span>
            </dt>
            <dd className="text-muted-foreground">
              <span className="text-foreground">{fact.label}:</span> <span className="tabular">{fact.value}</span>
              {fact.detail && <span className="text-subtle-foreground"> ({lowerFirst(fact.detail)})</span>}
            </dd>
          </div>
        )}
        {opportunity.recommendation[0] && (
          <div className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2.5">
            <dt className="pt-0.5">
              <ListChecks aria-hidden="true" className="size-4 text-subtle-foreground" />
              <span className="sr-only">Primeira ação recomendada</span>
            </dt>
            <dd className="line-clamp-2 text-foreground">{opportunity.recommendation[0]}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-subtle-foreground">
        <span>
          Detectada em <time dateTime={opportunity.detectedAt}>{formatDate(opportunity.detectedAt)}</time>
        </span>
        <span aria-hidden="true" className="inline-flex items-center gap-1 font-medium text-brand">
          Ver análise
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

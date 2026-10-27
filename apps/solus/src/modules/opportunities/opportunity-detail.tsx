'use client';

import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Meter } from '@/components/data/meter';
import { OPPORTUNITY_CATEGORY, OPPORTUNITY_STATUS, PriorityMark, StatusBadge } from '@/components/data/status';
import type { Opportunity, OpportunityStatus } from '@/lib/data/types';
import { formatDate, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { impactShort } from './impact';
import { EvidenceChart } from './opportunity-charts';

const STATUS_ORDER: OpportunityStatus[] = ['new', 'reviewing', 'in-progress', 'done', 'dismissed'];

export function ConfidenceMeter({ value, className }: { value: number; className?: string }) {
  const tone = value >= 0.8 ? 'positive' : value >= 0.6 ? 'brand' : 'warning';
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Meter value={value} tone={tone} label={`Confiança de ${formatPercent(value, 0)}`} className="w-16" />
      <span className="text-xs tabular text-muted-foreground">{formatPercent(value, 0)}</span>
    </span>
  );
}

export function OpportunityDetail({
  opportunity,
  status,
  onStatusChange,
  productNames,
}: {
  opportunity: Opportunity;
  status: OpportunityStatus;
  onStatusChange: (status: OpportunityStatus) => void;
  productNames: Record<string, string>;
}) {
  const impact = impactShort(opportunity);
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-4 *:py-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Impacto estimado</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular whitespace-nowrap">{impact.value}</dd>
          <dd className="text-xs text-subtle-foreground">{impact.suffix === '/mês' ? 'por mês' : 'ganho pontual'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Prioridade</dt>
          <dd className="mt-1.5">
            <PriorityMark priority={opportunity.priority} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Confiança</dt>
          <dd className="mt-2">
            <ConfidenceMeter value={opportunity.confidence} />
          </dd>
        </div>
      </dl>

      <section aria-labelledby="op-why">
        <h3 id="op-why" className="text-sm font-semibold text-foreground">
          Por que isso apareceu
        </h3>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{opportunity.explanation}</p>
      </section>

      <section aria-labelledby="op-evidence">
        <h3 id="op-evidence" className="text-sm font-semibold text-foreground">
          Evidências
        </h3>
        <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {opportunity.evidence.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/40 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular text-foreground">{item.value}</dd>
              {item.detail && <dd className="text-xs text-subtle-foreground">{item.detail}</dd>}
            </div>
          ))}
        </dl>
        {opportunity.series && (
          <div className="mt-4">
            <EvidenceChart series={opportunity.series} />
          </div>
        )}
      </section>

      <section aria-labelledby="op-plan">
        <h3 id="op-plan" className="text-sm font-semibold text-foreground">
          Recomendação
        </h3>
        <ol className="mt-2 flex flex-col gap-2">
          {opportunity.recommendation.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6 text-foreground">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-brand-soft text-2xs font-semibold text-brand">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="op-products">
        <h3 id="op-products" className="text-sm font-semibold text-foreground">
          Produtos envolvidos
        </h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {opportunity.products.map((id) => (
            <li key={id} className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
              {productNames[id] ?? id}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          Status
          <Select value={status} onValueChange={(value) => onStatusChange(value as OpportunityStatus)}>
            <SelectTrigger className="w-48 bg-card" aria-label="Status da oportunidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((value) => (
                <SelectItem key={value} value={value}>
                  {OPPORTUNITY_STATUS[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button asChild variant="outline">
          <Link href="/analista">
            <MessageSquareText aria-hidden="true" />
            Analisar com o analista
          </Link>
        </Button>
      </div>
      <p className="text-xs text-subtle-foreground">
        Detectada em {formatDate(opportunity.detectedAt)}, categoria {OPPORTUNITY_CATEGORY[opportunity.category].toLowerCase()}.{' '}
        <StatusBadge spec={OPPORTUNITY_STATUS[status]} className="ml-1 align-middle" />
      </p>
    </div>
  );
}

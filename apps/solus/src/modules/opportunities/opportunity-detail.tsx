'use client';

import { BadgeCheck, Calculator, CircleAlert, FlaskConical, ListChecks, ScanSearch, type LucideIcon } from 'lucide-react';
import { OPPORTUNITY_CATEGORY, OPPORTUNITY_STATUS, PRIORITY, PriorityMark, StatusBadge } from '@/components/data/status';
import type { Evidence, Opportunity, OpportunityStatus } from '@/lib/data/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ConfidenceMeter, confidenceLevel, type ConfidenceLevel } from './confidence';
import { impactShort } from './impact';
import { EvidenceChart } from './opportunity-charts';

const CONFIDENCE_NOTE: Record<ConfidenceLevel, string> = {
  alta: 'os dados confirmam o padrão.',
  moderada: 'o padrão é consistente, mas vale confirmar antes de agir.',
  baixa: 'é uma hipótese; teste em pequena escala antes de agir.',
};

function Section({
  id,
  icon: Icon,
  title,
  tag,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  tag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon aria-hidden="true" className="size-4 text-subtle-foreground" />
        <h3 id={id} className="text-sm font-semibold text-foreground">
          {title}
        </h3>
        {tag}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** Facts and estimates wear different marks everywhere in SOLUS: solid + check, dashed + flask. */
function BasisTag({ basis }: { basis: 'fact' | 'estimate' }) {
  return basis === 'fact' ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-positive-soft px-1.5 py-0.5 text-2xs font-medium text-positive-text">
      <BadgeCheck aria-hidden="true" className="size-3" />
      Verificado nos dados
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-2xs font-medium text-warning-text">
      <FlaskConical aria-hidden="true" className="size-3" />
      Estimativa
    </span>
  );
}

function EvidenceGrid({ items, dashed = false }: { items: Evidence[]; dashed?: boolean }) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className={cn('rounded-lg border px-3 py-2.5', dashed ? 'border-dashed border-warning/40' : 'bg-muted/40')}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular text-foreground">{item.value}</dd>
          {item.detail && <dd className="text-xs text-subtle-foreground">{item.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** The headline row of the detail: estimated value, priority and confidence. */
export function OpportunityFacts({ opportunity }: { opportunity: Opportunity }) {
  const impact = impactShort(opportunity);
  return (
    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-3 *:py-2.5 sm:*:px-4">
      <div>
        <dt className="text-xs text-muted-foreground">Impacto estimado</dt>
        <dd className="mt-0.5 text-base font-semibold whitespace-nowrap tabular text-foreground sm:text-lg">{impact.value}</dd>
        <dd className="text-xs text-subtle-foreground">{opportunity.impactKind === 'monthly' ? 'por mês' : 'ganho pontual'}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Prioridade</dt>
        <dd className="mt-1.5">
          <PriorityMark priority={opportunity.priority} short />
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Confiança</dt>
        <dd className="mt-2">
          <ConfidenceMeter value={opportunity.confidence} withWord />
        </dd>
      </div>
    </dl>
  );
}

/**
 * The full reading of one opportunity, in the order a decision needs it:
 * what was found, the data behind it, what it may be worth and on which
 * assumptions, why it matters now, and what to do.
 */
export function OpportunityDetail({
  opportunity,
  status,
  productNames,
}: {
  opportunity: Opportunity;
  status: OpportunityStatus;
  productNames: Record<string, string>;
}) {
  const impact = impactShort(opportunity);
  const facts = opportunity.evidence.filter((item) => item.basis !== 'estimate');
  const estimates = opportunity.evidence.filter((item) => item.basis === 'estimate');
  const level = confidenceLevel(opportunity.confidence);
  return (
    <div className="flex flex-col gap-8">
      <Section id="op-found" icon={ScanSearch} title="O que foi identificado">
        <p className="text-sm leading-6 text-foreground">{opportunity.finding}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Produtos envolvidos">
          {opportunity.products.map((id) => (
            <li key={id} className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
              {productNames[id] ?? id}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle-foreground">
          <span>
            Detectada em <time dateTime={opportunity.detectedAt}>{formatDate(opportunity.detectedAt)}</time>, categoria{' '}
            {OPPORTUNITY_CATEGORY[opportunity.category].toLowerCase()}
          </span>
          <StatusBadge spec={OPPORTUNITY_STATUS[status]} />
        </p>
      </Section>

      <Section id="op-evidence" icon={BadgeCheck} title="Dados que sustentam" tag={<BasisTag basis="fact" />}>
        <EvidenceGrid items={facts} />
        {opportunity.series && (
          <div className="mt-4 rounded-lg border p-4">
            <EvidenceChart series={opportunity.series} />
          </div>
        )}
      </Section>

      <Section id="op-impact" icon={Calculator} title="Impacto estimado" tag={<BasisTag basis="estimate" />}>
        <div className="rounded-lg border border-dashed border-warning/40 p-4">
          <p className="text-sm leading-6 text-foreground">
            <span className="text-lg font-semibold tabular">{impact.value}</span>{' '}
            {opportunity.impactKind === 'monthly' ? 'por mês' : 'uma única vez'}, se as premissas abaixo se confirmarem. Não é um ganho
            garantido.
          </p>
          {estimates.length > 0 && (
            <div className="mt-3">
              <EvidenceGrid items={estimates} dashed />
            </div>
          )}
          <h4 className="mt-4 text-xs font-medium text-muted-foreground">Premissas da estimativa</h4>
          <ul className="mt-1.5 flex flex-col gap-1.5 text-sm leading-6 text-muted-foreground">
            {opportunity.assumptions.map((assumption) => (
              <li key={assumption} className="flex gap-2">
                <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-warning" />
                {assumption}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="op-why" icon={CircleAlert} title="Por que merece atenção">
        <p className="text-sm leading-6 text-foreground">{opportunity.whyItMatters}</p>
        <p className="mt-2 text-xs text-subtle-foreground">
          Prioridade {PRIORITY[opportunity.priority].label.toLowerCase()}. Confiança {level}: {CONFIDENCE_NOTE[level]}
        </p>
      </Section>

      <Section id="op-plan" icon={ListChecks} title="Ação recomendada">
        <ol className="flex flex-col gap-2.5">
          {opportunity.recommendation.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6 text-foreground">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-brand-soft text-2xs font-semibold text-brand tabular">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

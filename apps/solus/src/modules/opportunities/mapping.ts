import type { Evidence, Opportunity, OpportunityCategory, OpportunityEvent, OpportunityStatus } from '@/lib/data/types';
import { formatCurrency, formatDate, formatDays, formatDecimal, formatNumber, formatPercent } from '@/lib/format';
import type { Fact } from '@/lib/intelligence/types';
import type { ImpactKindDb, OpportunityRow, OpportunityStatusDb, OpportunityTypeDb } from '@/types/database-analytics';

/** Stored opportunities (public.opportunities) → the shape the Opportunity Center renders. */

const STATUS_TO_UI: Record<OpportunityStatusDb, OpportunityStatus> = {
  new: 'new',
  reviewing: 'reviewing',
  in_progress: 'in-progress',
  resolved: 'done',
  dismissed: 'dismissed',
};

const STATUS_TO_DB: Record<OpportunityStatus, OpportunityStatusDb> = {
  new: 'new',
  reviewing: 'reviewing',
  'in-progress': 'in_progress',
  done: 'resolved',
  dismissed: 'dismissed',
};

export const toUiStatus = (status: OpportunityStatusDb) => STATUS_TO_UI[status];
export const toDbStatus = (status: OpportunityStatus) => STATUS_TO_DB[status];

const CATEGORY: Record<OpportunityTypeDb, OpportunityCategory> = {
  low_margin: 'pricing',
  negative_margin: 'pricing',
  profitability: 'pricing',
  stalled_stock: 'inventory',
  tied_up_capital: 'inventory',
  rupture_risk: 'rupture',
  performance_drop: 'performance',
};

const KIND: Record<ImpactKindDb, Opportunity['impactKind']> = {
  monthly_profit: 'monthly',
  one_off_profit: 'one-off',
  capital: 'capital',
};

const WHY: Record<OpportunityTypeDb, string> = {
  negative_margin: 'Cada venda deste produto reduz o lucro da empresa: quanto mais vende, mais perde.',
  low_margin: 'O produto vende, mas deixa menos do que a margem mínima definida para a empresa.',
  profitability: 'Há lucro sendo perdido por uma causa identificável nos dados: preço que não acompanhou o custo ou desconto acima do limite.',
  stalled_stock: 'Dinheiro parado na prateleira não volta para o caixa, e o produto pode perder valor com o tempo.',
  tied_up_capital: 'O estoque dura mais do que o necessário: há capital que poderia estar no caixa.',
  rupture_risk: 'Sem o produto na prateleira, a venda se perde e o cliente pode ir para a concorrência.',
  performance_drop: 'A queda é grande em relação ao período anterior e merece uma explicação antes de virar tendência.',
};

const EVENT_LABEL: Record<string, (to: OpportunityStatus | null) => string> = {
  detected: () => 'Detectada pela análise',
  redetected: () => 'Detectada de novo (estava resolvida)',
  auto_resolved: () => 'Resolvida pelo sistema: a condição não aparece mais nos dados',
  status_changed: (to) => `Status alterado para "${to ? STATUS_LABEL[to] : '—'}"`,
};

const STATUS_LABEL: Record<OpportunityStatus, string> = {
  new: 'Nova',
  reviewing: 'Em análise',
  'in-progress': 'Em andamento',
  done: 'Concluída',
  dismissed: 'Descartada',
};

export function formatFact(fact: Fact): string {
  const value = fact.value;
  if (typeof value === 'string') return fact.format === 'date' ? formatDate(value) : value;
  switch (fact.format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'days':
      return formatDays(value);
    case 'number':
      return Number.isInteger(value) ? formatNumber(value) : formatDecimal(value);
    default:
      return String(value);
  }
}

function isFact(value: unknown): value is Fact {
  return typeof value === 'object' && value !== null && 'label' in value && 'value' in value;
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

export interface StoredEvent {
  opportunity_id: string;
  event: string;
  to_status: OpportunityStatusDb | null;
  note: string | null;
  created_at: string;
  actor: string | null;
}

export function toOpportunity(row: OpportunityRow, events: StoredEvent[] = []): Opportunity {
  const facts: Fact[] = Array.isArray(row.facts) ? (row.facts as unknown[]).filter(isFact) : [];
  const evidence: Evidence[] = facts.map((fact) => ({ label: fact.label, value: formatFact(fact), detail: fact.source, basis: 'fact' }));
  const history: OpportunityEvent[] = events.map((event) => ({
    at: event.created_at,
    label: (EVENT_LABEL[event.event] ?? (() => event.event))(event.to_status ? toUiStatus(event.to_status) : null),
    actor: event.actor,
    note: event.note,
  }));
  return {
    id: row.id,
    title: row.title,
    category: CATEGORY[row.type],
    impact: Number(row.impact_value),
    impactKind: KIND[row.impact_kind],
    priority: row.priority,
    confidence: Number(row.confidence),
    status: toUiStatus(row.status),
    detectedAt: row.first_detected_at.slice(0, 10),
    summary: row.summary,
    finding: row.summary,
    whyItMatters: WHY[row.type],
    assumptions: [row.impact_method],
    recommendation: strings(row.recommendations),
    evidence,
    products: row.entity_type === 'product' && row.entity_id ? [row.entity_id] : [],
    hypotheses: strings(row.hypotheses),
    history,
    active: row.active,
  };
}

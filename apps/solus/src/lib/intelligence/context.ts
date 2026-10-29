import { formatDate } from '@/lib/format';
import { atLeast, MIN_CONFIDENCE, priorityFor } from './scoring';
import type { EngineInput, OpportunityDraft, Priority, ProductMetrics, Window } from './types';

/** What every rule sees besides the input: the company's scale and helpers. */
export interface RuleContext {
  input: EngineInput;
  scale: { monthlyGrossProfit: number | null; monthlyNetRevenue: number | null; stockValue: number | null };
  /** Products in the top 20% by gross profit in the main window. */
  topProducts: Set<string>;
  productsById: Map<string, ProductMetrics>;
}

export interface RuleResult {
  drafts: OpportunityDraft[];
  /** Conditions met, but without enough evidence (confidence or size). */
  discarded: number;
  limitations: string[];
}

export const emptyResult = (): RuleResult => ({ drafts: [], discarded: 0, limitations: [] });

export function windowSource(label: string, window: Window) {
  return `${label}, ${formatDate(window.start)} a ${formatDate(window.end)}`;
}

export function daysBetween(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

type DraftFields = Omit<OpportunityDraft, 'priority'> & {
  /** Minimum priority regardless of size (e.g. selling below cost). */
  floor?: Priority;
  /** Priority adjustment after sizing (e.g. perishable stock). */
  adjust?: (priority: Priority) => Priority;
};

/**
 * Finishes a draft: computes the priority from the impact and decides if the
 * evidence is enough. Returns null (and the rule counts it as discarded) when
 * the confidence is below MIN_CONFIDENCE.
 */
export function finish(ctx: RuleContext, fields: DraftFields): OpportunityDraft | null {
  if (fields.confidence < MIN_CONFIDENCE) return null;
  const { floor, adjust, ...draft } = fields;
  let priority = priorityFor(draft.impactKind, draft.impactValue, ctx.scale, draft.confidence);
  if (floor) priority = atLeast(priority, floor);
  if (adjust) priority = adjust(priority);
  return { ...draft, impactValue: Math.round(draft.impactValue * 100) / 100, priority };
}

export function productLabel(product: { name: string; sku: string }) {
  return `${product.name} (${product.sku})`;
}

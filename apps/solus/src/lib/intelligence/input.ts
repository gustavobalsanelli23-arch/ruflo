import type { Coverage } from '@/lib/analytics/mappers';
import { addDays, daysBetween } from '@/lib/period';
import type { AnalysisParameters, EngineInput, InventoryPosition, OpportunityDraft, PeriodTotals, ProductMetrics, Window } from './types';

/**
 * Assembles the engine's input from the metric layer. The reader is the only
 * way in: the server passes one backed by Supabase (src/services/analytics),
 * the database tests one backed by plain SQL, so both run this same code.
 *
 *   janela principal  últimos 90 dias até a última venda (limitada ao início
 *                     do histórico): margens, descontos, escala da empresa
 *   comparação        últimos 30 dias × 30 anteriores, só quando o histórico
 *                     cobre os dois períodos inteiros
 *   estoque           última posição importada
 */

export interface MetricsReader {
  coverage(): Promise<Coverage>;
  parameters(): Promise<AnalysisParameters>;
  totals(window: Window): Promise<PeriodTotals>;
  products(window: Window): Promise<ProductMetrics[]>;
  inventory(asOf: string): Promise<InventoryPosition[]>;
  inventoryTotals(asOf: string): Promise<{ stockValue: number; soldWithoutPosition: number }>;
}

export const MAIN_WINDOW_DAYS = 90;
export const COMPARISON_DAYS = 30;

export function windowEnding(end: string, days: number, floor: string | null): Window {
  const natural = addDays(end, -(days - 1));
  const start = floor && natural < floor ? floor : natural;
  return { start, end, days: daysBetween(start, end) };
}

export async function buildEngineInput(reader: MetricsReader): Promise<EngineInput> {
  const [coverage, params] = await Promise.all([reader.coverage(), reader.parameters()]);
  const { lastSale, firstSale, lastSnapshot } = coverage;
  const input: EngineInput = { params, dataThrough: lastSale, firstSale, window: null, totals: null, products: [], comparison: null, inventory: null };
  const loads: Promise<void>[] = [];

  if (lastSale && firstSale) {
    const window = windowEnding(lastSale, MAIN_WINDOW_DAYS, firstSale);
    input.window = window;
    loads.push(
      Promise.all([reader.totals(window), reader.products(window)]).then(([totals, products]) => {
        input.totals = totals;
        input.products = products;
      }),
    );

    const current = windowEnding(lastSale, COMPARISON_DAYS, null);
    const previous = windowEnding(addDays(current.start, -1), COMPARISON_DAYS, null);
    if (previous.start >= firstSale) {
      loads.push(
        Promise.all([reader.products(current), reader.products(previous)]).then(([currentProducts, previousProducts]) => {
          input.comparison = { current, previous, currentProducts, previousProducts };
        }),
      );
    }
  }

  if (lastSnapshot) {
    loads.push(
      Promise.all([reader.inventory(lastSnapshot), reader.inventoryTotals(lastSnapshot)]).then(([positions, totals]) => {
        input.inventory = { asOf: lastSnapshot, positions, totalValue: totals.stockValue, soldWithoutPosition: totals.soldWithoutPosition };
      }),
    );
  }

  await Promise.all(loads);
  return input;
}

/** The engine's drafts in the shape public.sync_opportunities expects. */
export function toSyncPayload(draft: OpportunityDraft) {
  return {
    type: draft.type,
    dedupe_key: draft.dedupeKey,
    entity_type: draft.entityType,
    entity_id: draft.entityId,
    entity_label: draft.entityLabel.slice(0, 200),
    title: draft.title.slice(0, 200),
    summary: draft.summary.slice(0, 600),
    priority: draft.priority,
    confidence: draft.confidence,
    impact_value: draft.impactValue,
    impact_kind: draft.impactKind,
    impact_method: draft.impactMethod.slice(0, 600),
    facts: draft.facts,
    hypotheses: draft.hypotheses,
    recommendations: draft.recommendations,
    series: null,
    period_start: draft.periodStart,
    period_end: draft.periodEnd,
  };
}

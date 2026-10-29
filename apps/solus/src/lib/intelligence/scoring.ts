import type { ImpactKind, Priority } from './types';

/**
 * Confidence, priority and impact normalization. Every number here is part
 * of the documented methodology (docs/intelligence-engine.md); changing one
 * changes what users see, so the tests pin them.
 */

export const ENGINE_VERSION = 'solus-engine-1.0';

/** Signals below this confidence are not turned into opportunities. */
export const MIN_CONFIDENCE = 0.5;

/** Smallest monthly impact worth an opportunity (R$). */
export const MIN_MONTHLY_IMPACT = 50;
/** Smallest capital worth an opportunity (R$). */
export const MIN_CAPITAL = 100;

export function clampConfidence(value: number) {
  return Math.round(Math.min(Math.max(value, 0), 0.99) * 100) / 100;
}

/** More days with sales, more trust in a product-level rate. */
export function sampleFactor(saleDays: number) {
  if (saleDays >= 20) return 1;
  if (saleDays >= 10) return 0.9;
  if (saleDays >= 5) return 0.8;
  return 0.7;
}

/**
 * Cost taken from the catalog at import time is the current cost then, not
 * the cost of each sale: trust it a little less when it dominates.
 */
export function costSourceFactor(fileLines: number, catalogLines: number) {
  const costed = fileLines + catalogLines;
  if (costed === 0) return 0.6;
  return catalogLines / costed > 0.5 ? 0.9 : 1;
}

/** Older stock positions describe the shelf less well. */
export function snapshotFactor(ageDays: number) {
  if (ageDays <= 7) return 1;
  if (ageDays <= 30) return 0.85;
  return 0.7;
}

/** Velocity measured over fewer days than configured is less stable. */
export function historyFactor(windowDays: number | null, configuredDays: number) {
  if (!windowDays || windowDays <= 0) return 0.5;
  return Math.max(0.7, Math.min(windowDays / configuredDays, 1));
}

/** Average per 30 days of an amount measured over `days` days. */
export function monthly(amount: number, days: number) {
  return days > 0 ? (amount / days) * 30 : 0;
}

const ORDER: Priority[] = ['low', 'medium', 'high', 'critical'];

export function raise(priority: Priority, steps = 1): Priority {
  return ORDER[Math.min(ORDER.indexOf(priority) + steps, ORDER.length - 1)]!;
}

export function atLeast(priority: Priority, floor: Priority): Priority {
  return ORDER.indexOf(priority) >= ORDER.indexOf(floor) ? priority : floor;
}

export function atMost(priority: Priority, ceiling: Priority): Priority {
  return ORDER.indexOf(priority) <= ORDER.indexOf(ceiling) ? priority : ceiling;
}

/**
 * Priority from the size of the impact relative to the company:
 *   lucro   participação no lucro bruto mensal: ≥ 8% crítica · ≥ 3% alta · ≥ 0,8% média
 *           (sem lucro bruto conhecido, sobre a receita líquida mensal: ≥ 2% · ≥ 0,8% · ≥ 0,2%)
 *   capital participação no capital em estoque: ≥ 15% crítica · ≥ 7% alta · ≥ 2% média
 * Low confidence (< 0,6) never reaches critical.
 */
export function priorityFor(
  kind: ImpactKind,
  value: number,
  scale: { monthlyGrossProfit: number | null; monthlyNetRevenue: number | null; stockValue: number | null },
  confidence: number,
): Priority {
  let share: number | null = null;
  let steps: [number, number, number];
  if (kind === 'capital') {
    share = scale.stockValue && scale.stockValue > 0 ? value / scale.stockValue : null;
    steps = [0.15, 0.07, 0.02];
  } else if (scale.monthlyGrossProfit && scale.monthlyGrossProfit > 0) {
    share = value / scale.monthlyGrossProfit;
    steps = [0.08, 0.03, 0.008];
  } else {
    share = scale.monthlyNetRevenue && scale.monthlyNetRevenue > 0 ? value / scale.monthlyNetRevenue : null;
    steps = [0.02, 0.008, 0.002];
  }
  let priority: Priority = 'low';
  if (share !== null) {
    if (share >= steps[0]) priority = 'critical';
    else if (share >= steps[1]) priority = 'high';
    else if (share >= steps[2]) priority = 'medium';
  }
  return confidence < 0.6 ? atMost(priority, 'high') : priority;
}

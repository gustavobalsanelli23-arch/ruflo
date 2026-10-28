'use client';

import { useReducedMotion } from 'motion/react';
import { formatCurrencyAxis, formatPercent } from '@/lib/format';
import { niceScale, percentDigits } from '@/lib/scale';

/** Recessive chart chrome shared by every chart: hairline grid, quiet axes. */
export const AXIS_TICK = { fill: 'var(--chart-axis)', fontSize: 11 } as const;
export const GRID_PROPS = { stroke: 'var(--chart-grid)', vertical: false } as const;
export const CURSOR_LINE = { stroke: 'var(--border-strong)', strokeWidth: 1 } as const;
export const CURSOR_BAND = { fill: 'var(--neutral-soft)' } as const;

export const SERIES = {
  one: 'var(--series-1)',
  two: 'var(--series-2)',
  three: 'var(--series-3)',
  muted: 'var(--series-muted)',
  ink: 'var(--foreground)',
  positive: 'var(--positive)',
  warning: 'var(--warning)',
  critical: 'var(--critical)',
} as const;

/**
 * One encoding for the money vocabulary on every screen: gross profit is the
 * accent, cost of goods is the muted step under it, revenue is their sum
 * (the bar's full height) or an ink line.
 */
export const MONEY = {
  profit: SERIES.one,
  cost: SERIES.muted,
  revenue: SERIES.ink,
} as const;

/** Charts animate in once, and not at all when the person prefers reduced motion. */
export function useChartAnimation() {
  const reduce = useReducedMotion();
  return { isAnimationActive: !reduce, animationDuration: 600, animationEasing: 'ease-out' as const };
}

type AxisOptions = { intervals?: number; includeZero?: boolean };

/** Y-axis props for money: round steps, one notation across all ticks. */
export function currencyAxis(values: number[], options: AxisOptions = {}) {
  const scale = niceScale(values, { includeZero: true, ...options });
  return {
    domain: [scale.min, scale.max] as [number, number],
    ticks: scale.ticks,
    interval: 0 as const,
    tickFormatter: (value: number) => formatCurrencyAxis(value, Math.max(Math.abs(scale.min), Math.abs(scale.max))),
  };
}

/** Y-axis props for ratios: round steps in percent, with a decimal only when the steps need it. */
export function percentAxis(values: number[], options: AxisOptions = {}) {
  const scale = niceScale(values, options);
  const digits = percentDigits(scale.step);
  return {
    domain: [scale.min, scale.max] as [number, number],
    ticks: scale.ticks,
    interval: 0 as const,
    tickFormatter: (value: number) => formatPercent(value, digits),
  };
}

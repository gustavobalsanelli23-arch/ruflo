'use client';

import { useReducedMotion } from 'motion/react';

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
  positive: 'var(--positive)',
  warning: 'var(--warning)',
  critical: 'var(--critical)',
} as const;

/** Charts animate in once, and not at all when the person prefers reduced motion. */
export function useChartAnimation() {
  const reduce = useReducedMotion();
  return { isAnimationActive: !reduce, animationDuration: 700, animationEasing: 'ease-out' as const };
}

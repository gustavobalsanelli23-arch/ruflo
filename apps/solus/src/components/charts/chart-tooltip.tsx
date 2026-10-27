'use client';

import type { TooltipContentProps } from 'recharts';
import { cn } from '@/lib/utils';

export interface TooltipSeries {
  key: string;
  label: string;
  color: string;
  format: (value: number) => string;
  /** Line keys for lines/areas, a swatch for bars (mirrors the mark). */
  mark?: 'line' | 'bar';
}

/**
 * One tooltip lists every series at the hovered X. Values lead (strong),
 * series names follow (secondary), keyed by a short stroke of the series colour.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  series,
  formatLabel,
}: Pick<TooltipContentProps<number, string>, 'active' | 'payload' | 'label'> & {
  series: TooltipSeries[];
  formatLabel?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Record<string, unknown> | undefined;
  return (
    <div className="glass-pop min-w-44 rounded-lg px-3 py-2.5 text-xs">
      <p className="mb-1.5 font-medium text-muted-foreground">{formatLabel ? formatLabel(String(label)) : label}</p>
      <ul className="flex flex-col gap-1">
        {series.map((s) => {
          const raw = row?.[s.key];
          if (typeof raw !== 'number') return null;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn('shrink-0 rounded-full', s.mark === 'bar' ? 'size-2 rounded-[2px]' : 'h-0.5 w-3')}
                style={{ background: s.color }}
              />
              <span className="tabular text-sm font-semibold text-foreground">{s.format(raw)}</span>
              <span className="ml-auto pl-3 text-muted-foreground">{s.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { cn } from '@/lib/format';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Texto exibido no tooltip. */
  display: string;
  detail?: string;
}

/**
 * Gráfico de barras de série única (azul da marca). Grade recessiva,
 * barras finas com topo arredondado e tooltip por barra (hover e foco).
 */
export function BarChart({ data, height = 220, ariaLabel }: { data: BarDatum[]; height?: number; ariaLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = [1, 0.5, 0];

  return (
    <figure aria-label={ariaLabel}>
      <div className="relative" style={{ height }}>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-dashed border-line/70" style={{ bottom: `${t * 100}%` }} aria-hidden />
        ))}
        <div className="absolute inset-0 flex items-end gap-2 sm:gap-3">
          {data.map((d) => {
            const isActive = active === d.key;
            return (
              <button
                key={d.key}
                type="button"
                className="group relative flex h-full flex-1 items-end justify-center focus:outline-none"
                onMouseEnter={() => setActive(d.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(d.key)}
                onBlur={() => setActive(null)}
                aria-label={`${d.label}: ${d.display}`}
              >
                <span
                  className={cn('w-full max-w-10 rounded-t-[4px] transition-colors', isActive ? 'bg-brand-400' : 'bg-brand-500')}
                  style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }}
                />
                {isActive && (
                  <span className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-line bg-surface-3 px-3 py-2 text-left text-xs shadow-xl" style={{ bottom: `calc(${(d.value / max) * 100}% + 8px)` }}>
                    <span className="block text-muted">{d.label}</span>
                    <span className="block font-bold text-fg">{d.display}</span>
                    {d.detail && <span className="block text-muted">{d.detail}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2 sm:gap-3">
        {data.map((d) => (
          <span key={d.key} className={cn('flex-1 text-center text-[0.68rem] tabular-nums', active === d.key ? 'text-fg' : 'text-muted')}>
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

export interface SegmentDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Barra empilhada horizontal + legenda com rótulos e valores (cor nunca sozinha). */
export function StackedBar({ data, total, unit }: { data: SegmentDatum[]; total?: number; unit: string }) {
  const sum = total ?? data.reduce((n, d) => n + d.value, 0);
  const [active, setActive] = useState<string | null>(null);
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-surface-3" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(', ')}>
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <span
              key={d.key}
              className={cn('h-full transition-opacity', active && active !== d.key && 'opacity-40')}
              style={{ width: `${(d.value / Math.max(sum, 1)) * 100}%`, background: d.color }}
              onMouseEnter={() => setActive(d.key)}
              onMouseLeave={() => setActive(null)}
              title={`${d.label}: ${d.value} ${unit}`}
            />
          ))}
      </div>
      <ul className="mt-4 space-y-2">
        {data.map((d) => (
          <li key={d.key} className={cn('flex items-center gap-3 rounded-lg px-1 text-sm transition-opacity', active && active !== d.key && 'opacity-50')} onMouseEnter={() => setActive(d.key)} onMouseLeave={() => setActive(null)}>
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
            <span className="flex-1 text-fg-2">{d.label}</span>
            <span className="font-bold tabular-nums">{d.value}</span>
            <span className="w-11 text-right text-xs tabular-nums text-muted">{sum ? Math.round((d.value / sum) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

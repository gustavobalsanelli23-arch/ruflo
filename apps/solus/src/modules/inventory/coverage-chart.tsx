'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_BAND, GRID_PROPS, SERIES, useChartAnimation } from '@/components/charts/chart-theme';
import type { CoverageBucket } from '@/lib/data/types';
import { formatCurrency, pluralize } from '@/lib/format';

const ATTENTION = new Set(['Mais de 120 dias', 'Sem venda']);

/**
 * Stock value by days of coverage. Buckets are ordered (short → long), so they
 * share one hue; the two that mean "money standing still" switch to the
 * warning status colour and say so in the legend.
 */
export function CoverageChart({ buckets }: { buckets: CoverageBucket[] }) {
  const animation = useChartAnimation();
  return (
    <ChartFrame
      legend={[
        { label: 'Valor a custo', color: SERIES.one, mark: 'bar' },
        { label: 'Capital parado', color: SERIES.warning, mark: 'bar' },
      ]}
      table={{
        caption: 'Valor de estoque e número de itens por faixa de cobertura',
        columns: [
          { key: 'bucket', label: 'Cobertura' },
          { key: 'value', label: 'Valor a custo', align: 'right' },
          { key: 'count', label: 'Itens', align: 'right' },
        ],
        rows: buckets.map((b) => ({ bucket: b.bucket, value: formatCurrency(b.stockValue, { whole: true }), count: String(b.skuCount) })),
      }}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 24, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="bucket" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} tickMargin={8} />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={60}
              tickFormatter={(v: number) => formatCurrency(v, { compact: true, whole: true })}
            />
            <Tooltip
              cursor={CURSOR_BAND}
              content={({ active, payload }) => {
                const b = payload?.[0]?.payload as CoverageBucket | undefined;
                if (!active || !b) return null;
                return (
                  <div className="glass-pop rounded-lg px-3 py-2.5 text-xs">
                    <p className="font-medium text-muted-foreground">{b.bucket}</p>
                    <p className="mt-1 text-sm font-semibold tabular text-foreground">{formatCurrency(b.stockValue, { whole: true })}</p>
                    <p className="text-muted-foreground">{pluralize(b.skuCount, 'item', 'itens')}</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="stockValue"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              label={{
                position: 'top',
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                formatter: (v: unknown) => formatCurrency(Number(v), { compact: true, whole: true }),
              }}
              {...animation}
            >
              {buckets.map((b) => (
                <Cell key={b.bucket} fill={ATTENTION.has(b.bucket) ? SERIES.warning : SERIES.one} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

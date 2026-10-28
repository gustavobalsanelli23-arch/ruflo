'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_BAND, SERIES, useChartAnimation } from '@/components/charts/chart-theme';
import type { CoverageBucket } from '@/lib/data/types';
import { formatCurrency, pluralize } from '@/lib/format';

const ATTENTION = new Set(['Mais de 120 dias', 'Sem venda']);

/**
 * Stock value by days of coverage, read top (runs out soon) to bottom
 * (standing still). The buckets are ordered, so they share one hue; the two
 * that mean money not moving switch to the warning colour and say so.
 */
export function CoverageChart({ buckets }: { buckets: CoverageBucket[] }) {
  const animation = useChartAnimation();
  const idle = buckets.filter((b) => ATTENTION.has(b.bucket)).reduce((sum, b) => sum + b.stockValue, 0);
  return (
    <ChartFrame
      legend={[
        { label: 'Valor a custo', color: SERIES.one, mark: 'bar' },
        { label: 'Capital parado', color: SERIES.warning, mark: 'bar' },
      ]}
      summary={`${formatCurrency(idle, { whole: true })} estão em faixas sem giro: mais de 120 dias de cobertura ou sem venda.`}
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
      <div className="h-64 xl:h-[26rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap="26%">
            <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="bucket" tick={AXIS_TICK} tickLine={false} axisLine={false} width={104} />
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
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              label={{
                position: 'right',
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                formatter: (value: unknown) => formatCurrency(Number(value), { compact: true, whole: true }),
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

'use client';

import { useState } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame, type LegendItem } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_BAND, CURSOR_LINE, GRID_PROPS, SERIES, useChartAnimation } from '@/components/charts/chart-theme';
import { ChartTooltip, type TooltipSeries } from '@/components/charts/chart-tooltip';
import { Delta } from '@/components/data/delta';
import { Segmented } from '@/components/data/segmented';
import { HeroFigure } from '@/components/data/stat';
import type { Comparison, Period, TrendPoint } from '@/lib/data/types';
import { formatCurrency, formatDay, formatMonth, relativeChange } from '@/lib/format';

type Measure = 'revenue' | 'grossProfit';

function tickLabel(date: string, granularity: Period['granularity']) {
  return granularity === 'month' ? formatMonth(date) : formatDay(date);
}

/**
 * Daily retail revenue swings with the weekday. Over 30 days the previous
 * window starts on a different weekday, so overlaying it invents crossings;
 * there the chart shows daily columns plus a 7-day average. Weekly and
 * monthly buckets (and the 7-day window) align, so they keep the comparison.
 */
function chartMode(period: Period, points: number): 'daily-average' | 'compare' {
  return period.granularity === 'day' && points > 7 ? 'daily-average' : 'compare';
}

export function RevenuePanel({
  period,
  revenue,
  grossProfit,
  trend,
}: {
  period: Period;
  revenue: Comparison;
  grossProfit: Comparison;
  trend: TrendPoint[];
}) {
  const [measure, setMeasure] = useState<Measure>('revenue');
  const animation = useChartAnimation();
  const mode = chartMode(period, trend.length);
  const label = measure === 'revenue' ? 'Receita' : 'Lucro bruto';
  const unit = period.granularity === 'day' ? 'por dia' : period.granularity === 'week' ? 'por semana' : 'por mês';
  const money = (value: number) => formatCurrency(value, { whole: true });
  const compact = (value: number) => formatCurrency(value, { compact: true, whole: true });

  const values = trend.map((point) => (measure === 'revenue' ? point.revenue : point.grossProfit));
  const data = trend.map((point, index) => {
    const window = values.slice(Math.max(0, index - 6), index + 1);
    return {
      date: point.date,
      current: values[index] ?? 0,
      average: window.reduce((sum, v) => sum + v, 0) / window.length,
      previous: measure === 'revenue' ? point.previousRevenue : undefined,
    };
  });

  const legend: LegendItem[] =
    mode === 'daily-average'
      ? [
          { label: `${label} ${unit}`, color: SERIES.one, mark: 'bar' },
          { label: 'Média de 7 dias', color: 'var(--foreground)' },
        ]
      : [
          { label: `${label} ${unit}`, color: SERIES.one },
          ...(measure === 'revenue' ? [{ label: 'Período anterior', color: SERIES.muted }] : []),
        ];

  const tooltipSeries: TooltipSeries[] =
    mode === 'daily-average'
      ? [
          { key: 'current', label, color: SERIES.one, format: money, mark: 'bar' },
          { key: 'average', label: 'Média 7 dias', color: 'var(--foreground)', format: money },
        ]
      : [
          { key: 'current', label, color: SERIES.one, format: money },
          { key: 'previous', label: 'Anterior', color: SERIES.muted, format: money },
        ];

  return (
    <section aria-labelledby="receita-titulo" className="surface flex min-w-0 flex-col rounded-xl p-5">
      <h2 id="receita-titulo" className="sr-only">
        Receita e evolução financeira
      </h2>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <HeroFigure
          label={`Receita, ${period.label.toLowerCase()}`}
          value={formatCurrency(revenue.value, { compact: true })}
          delta={<Delta value={relativeChange(revenue.value, revenue.previous)} />}
          footnote={`Período anterior: ${formatCurrency(revenue.previous, { compact: true })}. Lucro bruto: ${formatCurrency(grossProfit.value, { compact: true })}.`}
        />
        <Segmented
          size="sm"
          value={measure}
          onChange={setMeasure}
          label="Medida do gráfico"
          options={[
            { value: 'revenue', label: 'Receita' },
            { value: 'grossProfit', label: 'Lucro bruto' },
          ]}
        />
      </div>
      <ChartFrame
        className="mt-5"
        legend={legend}
        table={{
          caption: `${label} ${unit}, ${period.label.toLowerCase()}`,
          columns: [
            { key: 'date', label: 'Data' },
            { key: 'current', label, align: 'right' },
            mode === 'daily-average'
              ? { key: 'average', label: 'Média de 7 dias', align: 'right' }
              : { key: 'previous', label: 'Período anterior', align: 'right' },
          ],
          rows: data.map((d) => ({
            date: tickLabel(d.date, period.granularity),
            current: money(d.current),
            average: money(d.average),
            previous: d.previous === undefined ? '' : money(d.previous),
          })),
        }}
      >
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES.one} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={SERIES.one} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis
                dataKey="date"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: string) => tickLabel(value, period.granularity)}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} tickFormatter={compact} tickCount={5} />
              <Tooltip
                cursor={mode === 'daily-average' ? CURSOR_BAND : CURSOR_LINE}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload}
                    label={props.label}
                    formatLabel={(value) => tickLabel(value, period.granularity)}
                    series={tooltipSeries}
                  />
                )}
              />
              {mode === 'daily-average' ? (
                <>
                  <Bar dataKey="current" fill={SERIES.one} fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={24} {...animation} />
                  <Line type="monotone" dataKey="average" stroke="var(--foreground)" strokeWidth={2} dot={false} activeDot={false} {...animation} />
                </>
              ) : (
                <>
                  {measure === 'revenue' && (
                    <Line type="monotone" dataKey="previous" stroke={SERIES.muted} strokeWidth={1.5} dot={false} activeDot={false} {...animation} />
                  )}
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke={SERIES.one}
                    strokeWidth={2}
                    fill="url(#revenue-fill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                    {...animation}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartFrame>
    </section>
  );
}

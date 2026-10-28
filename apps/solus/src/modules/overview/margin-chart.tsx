'use client';

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_LINE, GRID_PROPS, MONEY, percentAxis, useChartAnimation } from '@/components/charts/chart-theme';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import type { Period, TrendPoint } from '@/lib/data/types';
import { formatDay, formatMonth, formatPercent } from '@/lib/format';

/**
 * Gross margin per bucket against the previous period's average. The line
 * wears the gross-profit hue: margin is the profit share of each real sold.
 */
export function MarginChart({ period, trend, previousMargin }: { period: Period; trend: TrendPoint[]; previousMargin: number }) {
  const animation = useChartAnimation();
  const data = trend.map((point) => ({ date: point.date, margin: point.revenue > 0 ? point.grossProfit / point.revenue : 0 }));
  const axis = percentAxis([...data.map((d) => d.margin), previousMargin]);
  const label = (value: string) => (period.granularity === 'month' ? formatMonth(value, true) : formatDay(value));
  const low = data.reduce((min, row) => (row.margin < min.margin ? row : min), data[0] ?? { date: '', margin: 0 });
  const high = data.reduce((max, row) => (row.margin > max.margin ? row : max), data[0] ?? { date: '', margin: 0 });

  return (
    <ChartFrame
      legend={[
        { label: 'Margem bruta', color: MONEY.profit },
        { label: 'Média do período anterior', color: 'var(--chart-axis)' },
      ]}
      summary={`A margem variou de ${formatPercent(low.margin)} em ${label(low.date)} a ${formatPercent(high.margin)} em ${label(high.date)}. O período anterior teve média de ${formatPercent(previousMargin)}.`}
      table={{
        caption: `Margem bruta, ${period.label.toLowerCase()}`,
        columns: [
          { key: 'date', label: period.granularity === 'month' ? 'Mês' : 'Data' },
          { key: 'margin', label: 'Margem', align: 'right' },
        ],
        rows: data.map((row) => ({ date: label(row.date), margin: formatPercent(row.margin) })),
      }}
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="date"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => (period.granularity === 'month' ? formatMonth(value) : formatDay(value))}
              minTickGap={28}
              tickMargin={8}
            />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} {...axis} />
            <ReferenceLine y={previousMargin} stroke="var(--chart-axis)" strokeOpacity={0.7} />
            <Tooltip
              cursor={CURSOR_LINE}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload}
                  label={props.label}
                  formatLabel={label}
                  series={[{ key: 'margin', label: 'Margem bruta', color: MONEY.profit, format: (v) => formatPercent(v) }]}
                />
              )}
            />
            <Line
              type={period.granularity === 'day' ? 'linear' : 'monotone'}
              dataKey="margin"
              stroke={MONEY.profit}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
              {...animation}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

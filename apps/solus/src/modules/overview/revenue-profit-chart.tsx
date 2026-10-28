'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame, type LegendItem } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_BAND, GRID_PROPS, MONEY, currencyAxis, useChartAnimation } from '@/components/charts/chart-theme';
import type { Period, TrendPoint } from '@/lib/data/types';
import { formatCurrency, formatDay, formatMonth, formatPercent } from '@/lib/format';

function bucketLabel(date: string, granularity: Period['granularity']) {
  if (granularity === 'month') return formatMonth(date, true);
  if (granularity === 'week') return `Semana de ${formatDay(date)}`;
  return formatDay(date);
}

/**
 * Daily retail revenue swings with the weekday. Over 30 days the previous
 * window starts on a different weekday, so overlaying it invents crossings;
 * there the reference line is the 7-day average. Weekly and monthly buckets
 * (and the 7-day window) align, so they compare against the previous period.
 */
function referenceMode(period: Period, points: number): 'average' | 'previous' {
  return period.granularity === 'day' && points > 7 ? 'average' : 'previous';
}

interface Row {
  date: string;
  profit: number;
  cost: number;
  revenue: number;
  margin: number;
  reference: number;
}

function TooltipCard({ row, granularity, referenceLabel }: { row: Row; granularity: Period['granularity']; referenceLabel: string }) {
  const money = (value: number) => formatCurrency(value, { whole: true });
  return (
    <div className="glass-pop min-w-52 rounded-lg px-3 py-2.5 text-xs">
      <p className="mb-2 font-medium text-muted-foreground">{bucketLabel(row.date, granularity)}</p>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Receita</dt>
        <dd className="text-right text-sm font-semibold tabular text-foreground">{money(row.revenue)}</dd>
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: MONEY.profit }} />
          Lucro bruto
        </dt>
        <dd className="text-right font-semibold tabular text-foreground">{money(row.profit)}</dd>
        <dt className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: MONEY.cost }} />
          Custo
        </dt>
        <dd className="text-right tabular text-foreground">{money(row.cost)}</dd>
        <dt className="text-muted-foreground">Margem</dt>
        <dd className="text-right tabular text-foreground">{formatPercent(row.margin)}</dd>
        <dt className="mt-1 flex items-center gap-1.5 border-t pt-1.5 text-muted-foreground">
          <span aria-hidden="true" className="h-0.5 w-2.5 rounded-full" style={{ background: MONEY.revenue }} />
          {referenceLabel}
        </dt>
        <dd className="mt-1 border-t pt-1.5 text-right tabular text-foreground">{money(row.reference)}</dd>
      </dl>
    </div>
  );
}

/**
 * Revenue split into what it costs and what it leaves. Gross profit sits on
 * the baseline (the part worth comparing bar to bar), cost of goods stacks on
 * top, and the bar's full height is revenue. One axis, one unit.
 */
export function RevenueProfitChart({ period, trend }: { period: Period; trend: TrendPoint[] }) {
  const animation = useChartAnimation();
  const mode = referenceMode(period, trend.length);
  const referenceLabel = mode === 'average' ? 'Receita, média de 7 dias' : 'Receita no período anterior';
  const money = (value: number) => formatCurrency(value, { whole: true });

  const data: Row[] = trend.map((point, index) => {
    const window = trend.slice(Math.max(0, index - 6), index + 1);
    return {
      date: point.date,
      profit: point.grossProfit,
      cost: point.revenue - point.grossProfit,
      revenue: point.revenue,
      margin: point.revenue > 0 ? point.grossProfit / point.revenue : 0,
      reference: mode === 'average' ? window.reduce((sum, p) => sum + p.revenue, 0) / window.length : point.previousRevenue,
    };
  });

  const axis = currencyAxis(data.flatMap((row) => [row.revenue, row.reference]));
  const best = data.reduce<Row | undefined>((top, row) => (!top || row.revenue > top.revenue ? row : top), undefined);
  const legend: LegendItem[] = [
    { label: 'Lucro bruto', color: MONEY.profit, mark: 'bar' },
    { label: 'Custo das mercadorias', color: MONEY.cost, mark: 'bar' },
    { label: referenceLabel, color: MONEY.revenue },
  ];

  return (
    <ChartFrame
      legend={legend}
      summary={
        best &&
        `Receita entre ${money(Math.min(...data.map((d) => d.revenue)))} e ${money(best.revenue)} por ${
          period.granularity === 'day' ? 'dia' : period.granularity === 'week' ? 'semana' : 'mês'
        }; o maior valor foi em ${bucketLabel(best.date, period.granularity)}. O lucro bruto é a parte de baixo de cada barra.`
      }
      table={{
        caption: `Receita, lucro bruto e custo das mercadorias, ${period.label.toLowerCase()}`,
        columns: [
          { key: 'date', label: period.granularity === 'month' ? 'Mês' : period.granularity === 'week' ? 'Semana' : 'Dia' },
          { key: 'revenue', label: 'Receita', align: 'right' },
          { key: 'cost', label: 'Custo', align: 'right' },
          { key: 'profit', label: 'Lucro bruto', align: 'right' },
          { key: 'margin', label: 'Margem', align: 'right' },
          { key: 'reference', label: mode === 'average' ? 'Média de 7 dias' : 'Período anterior', align: 'right' },
        ],
        rows: data.map((row) => ({
          date: bucketLabel(row.date, period.granularity),
          revenue: money(row.revenue),
          cost: money(row.cost),
          profit: money(row.profit),
          margin: formatPercent(row.margin),
          reference: money(row.reference),
        })),
      }}
    >
      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid {...GRID_PROPS} />
            <XAxis
              dataKey="date"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => (period.granularity === 'month' ? formatMonth(value) : formatDay(value))}
              minTickGap={24}
              tickMargin={8}
            />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={68} {...axis} />
            <Tooltip
              cursor={CURSOR_BAND}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Row | undefined;
                if (!active || !row) return null;
                return <TooltipCard row={row} granularity={period.granularity} referenceLabel={referenceLabel} />;
              }}
            />
            <Bar dataKey="profit" stackId="revenue" fill={MONEY.profit} stroke="var(--card)" strokeWidth={1} maxBarSize={24} {...animation} />
            <Bar dataKey="cost" stackId="revenue" fill={MONEY.cost} stroke="var(--card)" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={24} {...animation} />
            <Line
              type="monotone"
              dataKey="reference"
              stroke={MONEY.revenue}
              strokeWidth={2}
              strokeOpacity={0.85}
              dot={false}
              activeDot={false}
              {...animation}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

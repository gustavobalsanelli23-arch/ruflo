'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_BAND, CURSOR_LINE, GRID_PROPS, MONEY, SERIES, currencyAxis, percentAxis, useChartAnimation } from '@/components/charts/chart-theme';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import type { CategoryPerformance, MarginBand, MarginPoint, ProductProfit } from '@/lib/data/types';
import { formatCurrency, formatMonth, formatPercent } from '@/lib/format';

const BAND_COLOR: Record<MarginBand, string> = {
  healthy: SERIES.one,
  low: SERIES.warning,
  negative: SERIES.critical,
};

const BAND_LABEL: Record<MarginBand, string> = {
  healthy: 'Margem saudável',
  low: 'Margem baixa',
  negative: 'Margem negativa',
};

function ScatterDot(props: { cx?: number; cy?: number; payload?: ProductProfit }) {
  const { cx = 0, cy = 0, payload } = props;
  const band = payload?.band ?? 'healthy';
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      {/* Shape doubles the colour: circles are healthy, diamonds need attention. */}
      {band === 'healthy' ? (
        <circle cx={cx} cy={cy} r={4.5} fill={BAND_COLOR[band]} stroke="var(--card)" strokeWidth={2} />
      ) : (
        <rect
          x={cx - 4.5}
          y={cy - 4.5}
          width={9}
          height={9}
          transform={`rotate(45 ${cx} ${cy})`}
          fill={BAND_COLOR[band]}
          stroke="var(--card)"
          strokeWidth={2}
        />
      )}
    </g>
  );
}

/** Revenue × margin per product: what really earns, what sells but leaks margin. */
export function ProfitabilityMap({ products, threshold }: { products: ProductProfit[]; threshold: number }) {
  const animation = useChartAnimation();
  const sold = products.filter((p) => p.revenue > 0);
  const y = percentAxis([...sold.map((p) => p.margin), 0, threshold], { includeZero: true });
  const x = currencyAxis(sold.map((p) => p.revenue));
  const attention = sold.filter((p) => p.band !== 'healthy');
  return (
    <ChartFrame
      legend={(['healthy', 'low', 'negative'] as const).map((band) => ({ label: BAND_LABEL[band], color: BAND_COLOR[band], mark: 'dot' }))}
      summary={`${sold.length} produtos vendidos no período. ${attention.length} ficam abaixo do corte de ${formatPercent(threshold, 0)}: ${attention
        .map((p) => p.name)
        .join(', ')}.`}
      table={{
        caption: 'Receita e margem bruta por produto no período',
        columns: [
          { key: 'name', label: 'Produto' },
          { key: 'revenue', label: 'Receita', align: 'right' },
          { key: 'margin', label: 'Margem', align: 'right' },
        ],
        rows: sold.map((p) => ({ name: p.name, revenue: formatCurrency(p.revenue, { whole: true }), margin: formatPercent(p.margin) })),
      }}
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 28, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" />
            <ReferenceArea y1={y.domain[0]} y2={0} fill="var(--critical-soft)" fillOpacity={1} ifOverflow="hidden" />
            <ReferenceLine
              y={threshold}
              stroke="var(--warning)"
              strokeDasharray="4 4"
              label={{ value: `Corte de ${formatPercent(threshold, 0)}`, position: 'insideTopRight', fill: 'var(--chart-axis)', fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <XAxis
              type="number"
              dataKey="revenue"
              name="Receita"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Receita no período', position: 'insideBottomRight', offset: -2, fill: 'var(--chart-axis)', fontSize: 11 }}
              height={40}
              {...x}
            />
            <YAxis type="number" dataKey="margin" name="Margem" tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} {...y} />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as ProductProfit | undefined;
                if (!active || !p) return null;
                return (
                  <div className="glass-pop max-w-64 rounded-lg px-3 py-2.5 text-xs">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {p.category}, {BAND_LABEL[p.band].toLowerCase()}
                    </p>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                      <dt className="text-muted-foreground">Receita</dt>
                      <dd className="text-right font-semibold tabular text-foreground">{formatCurrency(p.revenue, { whole: true })}</dd>
                      <dt className="text-muted-foreground">Custo</dt>
                      <dd className="text-right tabular text-foreground">{formatCurrency(p.revenue - p.grossProfit, { whole: true })}</dd>
                      <dt className="text-muted-foreground">Lucro bruto</dt>
                      <dd className="text-right font-semibold tabular text-foreground">{formatCurrency(p.grossProfit, { whole: true })}</dd>
                      <dt className="text-muted-foreground">Margem</dt>
                      <dd className="text-right font-semibold tabular text-foreground">{formatPercent(p.margin)}</dd>
                    </dl>
                  </div>
                );
              }}
            />
            <Scatter data={sold} shape={<ScatterDot />} {...animation} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function CategoryMargins({ categories, threshold }: { categories: CategoryPerformance[]; threshold: number }) {
  const animation = useChartAnimation();
  const data = [...categories].sort((a, b) => b.margin - a.margin);
  const axis = percentAxis(data.map((c) => c.margin), { includeZero: true });
  const weakest = data.at(-1);
  return (
    <ChartFrame
      legend={[
        { label: 'Margem bruta', color: MONEY.profit, mark: 'bar' },
        { label: `Corte de ${formatPercent(threshold, 0)}`, color: SERIES.warning },
      ]}
      summary={weakest ? `${data[0]?.name} tem a maior margem, ${formatPercent(data[0]?.margin ?? 0)}. ${weakest.name} tem a menor, ${formatPercent(weakest.margin)}.` : undefined}
      table={{
        caption: 'Margem bruta por categoria',
        columns: [
          { key: 'name', label: 'Categoria' },
          { key: 'margin', label: 'Margem', align: 'right' },
          { key: 'profit', label: 'Lucro bruto', align: 'right' },
        ],
        rows: data.map((c) => ({ name: c.name, margin: formatPercent(c.margin), profit: formatCurrency(c.grossProfit, { whole: true }) })),
      }}
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
            <XAxis type="number" hide domain={axis.domain} />
            <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={124} />
            <ReferenceLine x={threshold} stroke="var(--warning)" strokeDasharray="4 4" />
            <Tooltip
              cursor={CURSOR_BAND}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload}
                  label={props.label}
                  series={[
                    { key: 'margin', label: 'Margem', color: MONEY.profit, format: (v) => formatPercent(v), mark: 'bar' },
                    { key: 'grossProfit', label: 'Lucro bruto', color: 'transparent', format: (v) => formatCurrency(v, { whole: true }) },
                  ]}
                />
              )}
            />
            <Bar
              dataKey="margin"
              fill={MONEY.profit}
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
              label={{ position: 'right', fill: 'var(--muted-foreground)', fontSize: 11, formatter: (v: unknown) => formatPercent(Number(v)) }}
              {...animation}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function MarginTrend({ points }: { points: MarginPoint[] }) {
  const animation = useChartAnimation();
  const axis = percentAxis(points.flatMap((p) => [p.margin, p.previousMargin]));
  const last = points.at(-1);
  return (
    <ChartFrame
      legend={[
        { label: 'Margem bruta', color: MONEY.profit },
        { label: 'Mesmo mês, ano anterior', color: 'var(--chart-axis)' },
      ]}
      summary={last ? `Em ${formatMonth(last.date, true)}, margem de ${formatPercent(last.margin)} contra ${formatPercent(last.previousMargin)} um ano antes.` : undefined}
      table={{
        caption: 'Margem bruta mensal nos últimos 12 meses e no ano anterior',
        columns: [
          { key: 'month', label: 'Mês' },
          { key: 'margin', label: 'Margem', align: 'right' },
          { key: 'previous', label: 'Ano anterior', align: 'right' },
        ],
        rows: points.map((p) => ({ month: formatMonth(p.date, true), margin: formatPercent(p.margin), previous: formatPercent(p.previousMargin) })),
      }}
    >
      <div className="h-72 xl:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: string) => formatMonth(v)} tickMargin={8} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} {...axis} />
            <Tooltip
              cursor={CURSOR_LINE}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload}
                  label={props.label}
                  formatLabel={(v) => formatMonth(v, true)}
                  series={[
                    { key: 'margin', label: 'Margem', color: MONEY.profit, format: (v) => formatPercent(v) },
                    { key: 'previousMargin', label: 'Ano anterior', color: 'var(--chart-axis)', format: (v) => formatPercent(v) },
                  ]}
                />
              )}
            />
            <Line type="monotone" dataKey="previousMargin" stroke="var(--chart-axis)" strokeOpacity={0.8} strokeWidth={1.5} dot={false} activeDot={false} {...animation} />
            <Line
              type="monotone"
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

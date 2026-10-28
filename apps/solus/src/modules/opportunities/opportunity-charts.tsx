'use client';

import {
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
} from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_LINE, GRID_PROPS, SERIES, currencyAxis, percentAxis, useChartAnimation } from '@/components/charts/chart-theme';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import type { EvidenceSeries, Opportunity } from '@/lib/data/types';
import { formatCurrency, formatMonth, formatPercent } from '@/lib/format';
import { monthlyEquivalent } from './impact';

export const CONFIDENCE_CUT = 0.7;
export const IMPACT_CUT = 1000;

interface MapPoint {
  id: string;
  rank: number;
  title: string;
  confidence: number;
  monthly: number;
}

function Dot(props: { cx?: number; cy?: number; payload?: MapPoint; selected?: string | null }) {
  const { cx = 0, cy = 0, payload, selected } = props;
  const active = payload?.id === selected;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={active ? 11 : 9.5}
        fill={active ? 'var(--foreground)' : SERIES.one}
        stroke="var(--card)"
        strokeWidth={2}
      />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={10} fontWeight={600} fill={active ? 'var(--background)' : '#fff'}>
        {payload?.rank}
      </text>
    </g>
  );
}

/** A 2x2: confidence against expected monthly value. Position is the argument. */
export function PriorityMap({
  items,
  selectedId,
  onSelect,
}: {
  items: Opportunity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const data: MapPoint[] = items.map((op, index) => ({
    id: op.id,
    rank: index + 1,
    title: op.title,
    confidence: op.confidence,
    monthly: monthlyEquivalent(op),
  }));
  const y = currencyAxis([...data.map((d) => d.monthly * 1.12), IMPACT_CUT * 2]);
  const maxY = y.domain[1];
  const quadrant = { fill: 'var(--chart-axis)', fontSize: 11 };
  return (
    <ChartFrame
      legend={[{ label: 'Oportunidade aberta; o número é a posição na fila de prioridade', color: SERIES.one, mark: 'dot' }]}
      summary={`${data.length} oportunidades abertas. ${data.filter((d) => d.confidence >= CONFIDENCE_CUT && d.monthly >= IMPACT_CUT).length} estão no quadrante fazer agora: confiança acima de ${formatPercent(CONFIDENCE_CUT, 0)} e mais de ${formatCurrency(IMPACT_CUT, { whole: true })} por mês.`}
      table={{
        caption: 'Oportunidades por confiança e valor mensal equivalente',
        columns: [
          { key: 'rank', label: 'Nº' },
          { key: 'title', label: 'Oportunidade' },
          { key: 'confidence', label: 'Confiança', align: 'right' },
          { key: 'monthly', label: 'Valor mensal equiv.', align: 'right' },
        ],
        rows: data.map((d) => ({
          rank: String(d.rank),
          title: d.title,
          confidence: formatPercent(d.confidence, 0),
          monthly: formatCurrency(d.monthly, { whole: true }),
        })),
      }}
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" />
            <ReferenceArea x1={CONFIDENCE_CUT} x2={1} y1={IMPACT_CUT} y2={maxY} fill="var(--brand-soft)" fillOpacity={1} ifOverflow="hidden" label={{ value: 'Fazer agora', position: 'insideTopRight', ...quadrant }} />
            <ReferenceArea x1={0.3} x2={CONFIDENCE_CUT} y1={IMPACT_CUT} y2={maxY} fillOpacity={0} label={{ value: 'Validar antes', position: 'insideTopLeft', ...quadrant }} />
            <ReferenceArea x1={CONFIDENCE_CUT} x2={1} y1={0} y2={IMPACT_CUT} fillOpacity={0} label={{ value: 'Ganhos menores', position: 'insideTopRight', ...quadrant }} />
            <ReferenceArea x1={0.3} x2={CONFIDENCE_CUT} y1={0} y2={IMPACT_CUT} fillOpacity={0} label={{ value: 'Monitorar', position: 'insideTopLeft', ...quadrant }} />
            <ReferenceLine x={CONFIDENCE_CUT} stroke="var(--border-strong)" />
            <ReferenceLine y={IMPACT_CUT} stroke="var(--border-strong)" />
            <XAxis
              type="number"
              dataKey="confidence"
              domain={[0.3, 1]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatPercent(v, 0)}
              ticks={[0.3, 0.5, 0.7, 0.9]}
              label={{ value: 'Confiança', position: 'insideBottomRight', offset: -2, fill: 'var(--chart-axis)', fontSize: 11 }}
              height={40}
            />
            <YAxis type="number" dataKey="monthly" tick={AXIS_TICK} tickLine={false} axisLine={false} width={64} {...y} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as MapPoint | undefined;
                if (!active || !p) return null;
                return (
                  <div className="glass-pop max-w-64 rounded-lg px-3 py-2.5 text-xs">
                    <p className="font-medium text-foreground">
                      {p.rank}. {p.title}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {formatCurrency(p.monthly, { whole: true })} por mês, confiança de {formatPercent(p.confidence, 0)}
                    </p>
                  </div>
                );
              }}
            />
            <Scatter
              data={data}
              shape={<Dot selected={selectedId} />}
              onClick={(point: { payload?: MapPoint }) => point.payload && onSelect(point.payload.id)}
              className="cursor-pointer"
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function EvidenceChart({ series }: { series: EvidenceSeries }) {
  const animation = useChartAnimation();
  const format = (v: number) =>
    series.unit === 'percent' ? formatPercent(v) : series.unit === 'currency' ? formatCurrency(v, { whole: true }) : String(Math.round(v));
  const values = series.points.map((p) => p.value);
  const axis = series.unit === 'percent' ? percentAxis(values) : currencyAxis(values, { includeZero: false });
  return (
    <ChartFrame
      legend={[{ label: series.label, color: SERIES.one }]}
      table={{
        caption: series.label,
        columns: [
          { key: 'month', label: 'Mês' },
          { key: 'value', label: 'Valor', align: 'right' },
        ],
        rows: series.points.map((p) => ({ month: formatMonth(p.date, true), value: format(p.value) })),
      }}
    >
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: string) => formatMonth(v)} minTickGap={16} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} {...axis} />
            <Tooltip
              cursor={CURSOR_LINE}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload}
                  label={props.label}
                  formatLabel={(v) => formatMonth(v, true)}
                  series={[{ key: 'value', label: series.label, color: SERIES.one, format }]}
                />
              )}
            />
            <Line type="monotone" dataKey="value" stroke={SERIES.one} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }} {...animation} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

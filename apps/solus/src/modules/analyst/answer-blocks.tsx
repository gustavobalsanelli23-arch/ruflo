'use client';

import { CheckCircle2, Database, FlaskConical, CornerDownRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_BAND, CURSOR_LINE, GRID_PROPS, SERIES, useChartAnimation } from '@/components/charts/chart-theme';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import type { AnswerBlock } from '@/lib/data/types';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

type ChartBlock = Extract<AnswerBlock, { kind: 'chart' }>;

function AnswerChart({ block }: { block: ChartBlock }) {
  const animation = useChartAnimation();
  const format = (v: number) => (block.unit === 'percent' ? formatPercent(v) : formatCurrency(v, { whole: true }));
  const horizontal = block.unit === 'currency';
  const values = block.points.map((p) => p.value);
  const pad = (Math.max(...values) - Math.min(...values)) * 0.25 || 0.01;
  return (
    <ChartFrame
      legend={[{ label: block.title, color: SERIES.one, mark: horizontal ? 'bar' : 'line' }]}
      table={{
        caption: block.title,
        columns: [
          { key: 'label', label: horizontal ? 'Item' : 'Mês' },
          { key: 'value', label: 'Valor', align: 'right' },
        ],
        rows: block.points.map((p) => ({ label: p.label, value: format(p.value) })),
      }}
    >
      <div className={horizontal ? 'h-56' : 'h-48'}>
        <ResponsiveContainer width="100%" height="100%">
          {horizontal ? (
            <BarChart data={block.points} layout="vertical" margin={{ top: 0, right: 64, bottom: 0, left: 0 }} barCategoryGap="30%">
              <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} width={168} />
              <Tooltip
                cursor={CURSOR_BAND}
                content={(props) => (
                  <ChartTooltip active={props.active} payload={props.payload} label={props.label} series={[{ key: 'value', label: block.title, color: SERIES.one, format, mark: 'bar' }]} />
                )}
              />
              <Bar
                dataKey="value"
                fill={SERIES.one}
                radius={[0, 4, 4, 0]}
                maxBarSize={18}
                label={{ position: 'right', fill: 'var(--muted-foreground)', fontSize: 11, formatter: (v: unknown) => format(Number(v)) }}
                {...animation}
              />
            </BarChart>
          ) : (
            <LineChart data={block.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={[Math.min(...values) - pad, Math.max(...values) + pad]}
                tickFormatter={(v: number) => (block.unit === 'percent' ? formatPercent(v, 0) : formatCurrency(v, { compact: true, whole: true }))}
                tickCount={4}
              />
              <Tooltip
                cursor={CURSOR_LINE}
                content={(props) => (
                  <ChartTooltip active={props.active} payload={props.payload} label={props.label} series={[{ key: 'value', label: block.title, color: SERIES.one, format }]} />
                )}
              />
              <Line type="monotone" dataKey="value" stroke={SERIES.one} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, stroke: 'var(--card)', fill: SERIES.one }} {...animation} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function AnswerBlocks({ blocks, onFollowUp }: { blocks: AnswerBlock[]; onFollowUp?: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'summary':
            return (
              <p key={index} className="max-w-[70ch] text-base leading-7 text-foreground sm:text-lg sm:leading-8">
                {block.text}
              </p>
            );
          case 'metrics':
            return (
              <dl key={index} className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 *:bg-card *:px-4 *:py-3">
                {block.items.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-lg font-semibold tracking-[-0.01em] text-foreground">{item.value}</span>
                      {item.delta && (
                        <span
                          className={cn(
                            'text-xs font-medium tabular',
                            item.tone === 'positive' && 'text-positive-text',
                            item.tone === 'negative' && 'text-critical-text',
                            (!item.tone || item.tone === 'neutral') && 'text-muted-foreground',
                          )}
                        >
                          {item.delta}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            );
          case 'chart':
            return (
              <div key={index} className="rounded-lg border p-4">
                <AnswerChart block={block} />
              </div>
            );
          case 'findings':
            return (
              <div key={index} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <section aria-label="Fatos" className="rounded-lg border p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 aria-hidden="true" className="size-4 text-positive-text" />
                    Fatos verificados nos dados
                  </h4>
                  <ul className="mt-2.5 flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
                    {block.facts.map((fact) => (
                      <li key={fact} className="flex gap-2">
                        <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-positive" />
                        {fact}
                      </li>
                    ))}
                  </ul>
                </section>
                <section aria-label="Hipóteses" className="rounded-lg border border-dashed border-warning/40 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FlaskConical aria-hidden="true" className="size-4 text-warning-text" />
                    Hipóteses a validar
                  </h4>
                  <ul className="mt-2.5 flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
                    {block.hypotheses.map((hypothesis) => (
                      <li key={hypothesis} className="flex gap-2">
                        <span aria-hidden="true" className="mt-2.5 size-1 shrink-0 rounded-full bg-warning" />
                        {hypothesis}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            );
          case 'sources':
            return (
              <div key={index}>
                <p className="text-xs font-medium text-muted-foreground">Dados utilizados</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {block.items.map((source) => (
                    <li key={source.name} className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
                      <Database aria-hidden="true" className="size-3.5 text-subtle-foreground" />
                      <span className="font-medium text-foreground">{source.name}</span>
                      <span className="text-muted-foreground">{source.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          case 'next':
            return (
              <div key={index} className="flex flex-wrap gap-2">
                {block.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onFollowUp?.(item)}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <CornerDownRight aria-hidden="true" className="size-3.5" />
                    {item}
                  </button>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

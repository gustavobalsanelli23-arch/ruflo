'use client';

import { BadgeCheck, CornerDownRight, Database, FlaskConical, ListChecks } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AXIS_TICK, CURSOR_BAND, CURSOR_LINE, GRID_PROPS, MONEY, percentAxis, useChartAnimation } from '@/components/charts/chart-theme';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import type { AnswerBlock } from '@/lib/data/types';
import { formatCurrency, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

type ChartBlock = Extract<AnswerBlock, { kind: 'chart' }>;
type TableBlock = Extract<AnswerBlock, { kind: 'table' }>;

function AnswerChart({ block }: { block: ChartBlock }) {
  const animation = useChartAnimation();
  const format = (v: number) => (block.unit === 'percent' ? formatPercent(v) : formatCurrency(v, { whole: true }));
  const horizontal = block.unit === 'currency';
  const axis = percentAxis(block.points.map((p) => p.value));
  return (
    <ChartFrame
      legend={[{ label: block.title, color: MONEY.profit, mark: horizontal ? 'bar' : 'line' }]}
      table={{
        caption: block.title,
        columns: [
          { key: 'label', label: horizontal ? 'Item' : 'Mês' },
          { key: 'value', label: 'Valor', align: 'right' },
        ],
        rows: block.points.map((p) => ({ label: p.label, value: format(p.value) })),
      }}
    >
      <div className={horizontal ? 'h-56' : 'h-52'}>
        <ResponsiveContainer width="100%" height="100%">
          {horizontal ? (
            <BarChart data={block.points} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }} barCategoryGap="30%">
              <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} width={176} />
              <Tooltip
                cursor={CURSOR_BAND}
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload}
                    label={props.label}
                    series={[{ key: 'value', label: block.title, color: MONEY.profit, format, mark: 'bar' }]}
                  />
                )}
              />
              <Bar
                dataKey="value"
                fill={MONEY.profit}
                radius={[0, 4, 4, 0]}
                maxBarSize={18}
                label={{ position: 'right', fill: 'var(--muted-foreground)', fontSize: 11, formatter: (v: unknown) => format(Number(v)) }}
                {...animation}
              />
            </BarChart>
          ) : (
            <LineChart data={block.points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} {...axis} />
              <Tooltip
                cursor={CURSOR_LINE}
                content={(props) => (
                  <ChartTooltip active={props.active} payload={props.payload} label={props.label} series={[{ key: 'value', label: block.title, color: MONEY.profit, format }]} />
                )}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={MONEY.profit}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2, stroke: 'var(--card)', fill: MONEY.profit }}
                {...animation}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

function AnswerTable({ block }: { block: TableBlock }) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">{block.title}</caption>
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              {block.columns.map((column) => (
                <th key={column.key} scope="col" className={cn('h-9 px-3 font-medium whitespace-nowrap first:pl-4 last:pr-4', column.align === 'right' ? 'text-right' : 'text-left')}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {block.rows.map((row, index) => (
              <tr key={index}>
                {block.columns.map((column, columnIndex) =>
                  columnIndex === 0 ? (
                    <th key={column.key} scope="row" className="py-2.5 pr-3 pl-4 text-left font-normal text-foreground">
                      {row[column.key]}
                    </th>
                  ) : (
                    <td
                      key={column.key}
                      className={cn('px-3 py-2.5 whitespace-nowrap tabular text-muted-foreground last:pr-4', column.align === 'right' ? 'text-right' : 'text-left')}
                    >
                      {row[column.key]}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.note && <p className="mt-2 text-xs text-subtle-foreground">{block.note}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2.5 text-xs font-medium text-muted-foreground">{children}</h4>;
}

/**
 * An answer reads like a short report: the answer first, the numbers, the
 * evidence (chart or table), facts kept apart from hypotheses, what to do,
 * the data it used and where to go next.
 */
export function AnswerBlocks({ blocks, onFollowUp }: { blocks: AnswerBlock[]; onFollowUp?: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'summary':
            return (
              <p key={index} className="max-w-[68ch] text-base leading-7 text-foreground sm:text-lg sm:leading-8">
                {block.text}
              </p>
            );
          case 'metrics':
            return (
              <dl key={index} className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border *:bg-card *:px-3 *:py-3 sm:*:px-4">
                {block.items.map((item) => (
                  <div key={item.label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                      <span className="text-base font-semibold tracking-[-0.01em] text-foreground sm:text-lg">{item.value}</span>
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
              <section key={index} aria-label={block.title}>
                <SectionTitle>Evidência</SectionTitle>
                <div className="rounded-lg border p-4">
                  <AnswerChart block={block} />
                </div>
              </section>
            );
          case 'table':
            return (
              <section key={index} aria-label={block.title}>
                <SectionTitle>{block.title}</SectionTitle>
                <AnswerTable block={block} />
              </section>
            );
          case 'findings':
            return (
              <div key={index} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <section aria-label="Fatos" className="rounded-lg border p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BadgeCheck aria-hidden="true" className="size-4 text-positive-text" />
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
          case 'recommendation':
            return (
              <section key={index} aria-labelledby={`recomendacao-${index}`} className="rounded-lg border bg-brand-soft/40 p-4">
                <h4 id={`recomendacao-${index}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ListChecks aria-hidden="true" className="size-4 text-brand" />
                  O que fazer
                </h4>
                <ol className="mt-2.5 flex flex-col gap-2">
                  {block.items.map((item, step) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-foreground">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-brand-soft text-2xs font-semibold text-brand tabular">
                        {step + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </section>
            );
          case 'sources':
            return (
              <section key={index} aria-label="Dados utilizados">
                <SectionTitle>Dados utilizados</SectionTitle>
                <ul className="flex flex-wrap gap-2">
                  {block.items.map((source) => (
                    <li key={source.name} className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
                      <Database aria-hidden="true" className="size-3.5 text-subtle-foreground" />
                      <span className="font-medium text-foreground">{source.name}</span>
                      <span className="text-muted-foreground">{source.detail}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          case 'next':
            return (
              <section key={index} aria-label="Continue a análise">
                <SectionTitle>Continue a análise</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {block.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onFollowUp?.(item)}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-left text-sm text-muted-foreground outline-none transition-colors hover:border-border-strong hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <CornerDownRight aria-hidden="true" className="size-3.5 shrink-0" />
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

/** Plain-text version of an answer, for copying into a message or a report. */
export function answerToText(blocks: AnswerBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.kind === 'summary') lines.push(block.text, '');
    if (block.kind === 'metrics') lines.push(...block.items.map((i) => `${i.label}: ${i.value}${i.delta ? ` (${i.delta})` : ''}`), '');
    if (block.kind === 'findings') {
      lines.push('Fatos:', ...block.facts.map((f) => `- ${f}`), 'Hipóteses:', ...block.hypotheses.map((h) => `- ${h}`), '');
    }
    if (block.kind === 'recommendation') lines.push('O que fazer:', ...block.items.map((item, i) => `${i + 1}. ${item}`), '');
    if (block.kind === 'sources') lines.push(`Dados: ${block.items.map((s) => `${s.name} (${s.detail})`).join('; ')}`);
  }
  return lines.join('\n').trim();
}

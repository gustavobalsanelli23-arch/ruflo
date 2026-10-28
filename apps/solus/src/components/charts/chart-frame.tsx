'use client';

import { ChartLine, Table2 } from 'lucide-react';
import { useState } from 'react';
import { Segmented } from '@/components/data/segmented';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface LegendItem {
  label: string;
  color: string;
  mark?: 'line' | 'bar' | 'dot';
}

export interface ChartTable {
  caption: string;
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  rows: Record<string, string>[];
}

export function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'shrink-0',
              item.mark === 'bar' && 'size-2.5 rounded-[2px]',
              item.mark === 'dot' && 'size-2 rounded-full',
              (!item.mark || item.mark === 'line') && 'h-0.5 w-3.5 rounded-full',
            )}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Every chart ships with its table twin (dataviz accessibility rule): the same
 * values, reachable without hovering or seeing colour.
 */
export function ChartFrame({
  legend,
  table,
  summary,
  children,
  toolbar,
  className,
}: {
  legend?: LegendItem[];
  table: ChartTable;
  /** One or two sentences a screen reader hears instead of the picture. */
  summary?: string;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <figure className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex items-start justify-between gap-3">
        {legend ? <Legend items={legend} className="min-w-0 flex-1 pt-1.5" /> : <span />}
        <div className="flex shrink-0 items-center gap-2">
          {toolbar}
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            label="Forma de visualização"
            options={[
              { value: 'chart', label: <ChartLine aria-hidden="true" />, ariaLabel: 'Ver gráfico' },
              { value: 'table', label: <Table2 aria-hidden="true" />, ariaLabel: 'Ver tabela' },
            ]}
          />
        </div>
      </div>
      {view === 'chart' ? (
        <div className="min-w-0">{children}</div>
      ) : (
        <div className="max-h-80 overflow-auto rounded-lg border">
          <Table scrollLabel={`Tabela: ${table.caption}`} className="[&_td:first-child]:pl-3 [&_td:last-child]:pr-3 [&_th:first-child]:pl-3 [&_th:last-child]:pr-3">
            <caption className="sr-only">{table.caption}</caption>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                {table.columns.map((column) => (
                  <TableHead key={column.key} className={cn('h-9 text-xs text-muted-foreground', column.align === 'right' && 'text-right')}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, index) => (
                <TableRow key={index}>
                  {table.columns.map((column) => (
                    <TableCell key={column.key} className={cn('tabular', column.align === 'right' && 'text-right')}>
                      {row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <figcaption className="sr-only">
        {table.caption}
        {summary ? `. ${summary}` : ''}
      </figcaption>
    </figure>
  );
}

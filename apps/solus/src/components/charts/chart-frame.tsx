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
  children,
  toolbar,
  className,
}: {
  legend?: LegendItem[];
  table: ChartTable;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <figure className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {legend ? <Legend items={legend} /> : <span />}
        <div className="flex items-center gap-2">
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
          <Table>
            <caption className="sr-only">{table.caption}</caption>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                {table.columns.map((column) => (
                  <TableHead key={column.key} className={cn(column.align === 'right' && 'text-right')}>
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
      <figcaption className="sr-only">{table.caption}</figcaption>
    </figure>
  );
}

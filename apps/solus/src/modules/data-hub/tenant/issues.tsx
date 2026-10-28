'use client';

import { ChevronLeft, ChevronRight, CircleAlert, TriangleAlert } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Segmented } from '@/components/data/segmented';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { IssueGroup, IssueRow } from '@/services/imports';
import { issuesPageAction } from '../actions';

const PAGE = 50;

/** Problems grouped by kind, with the first rows affected (from public.import_issue_summary). */
export function IssueGroups({ groups }: { groups: IssueGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {groups.map((group) => {
        const error = group.severity === 'error';
        const Icon = error ? CircleAlert : TriangleAlert;
        return (
          <li key={`${group.severity}-${group.code}-${group.field}`} className="flex gap-3 px-4 py-3">
            <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', error ? 'text-critical-text' : 'text-warning-text')} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="sr-only">{error ? 'Erro: ' : 'Aviso: '}</span>
                {group.message}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatNumber(group.occurrences)} {group.occurrences === 1 ? 'linha' : 'linhas'}
                {group.sampleRows.length > 0 && `: ${group.sampleRows.join(', ')}${group.occurrences > group.sampleRows.length ? '…' : ''}`}
                {error ? ' (não importadas)' : ' (importadas com o ajuste descrito)'}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Every problem, one per line, paginated on the server. */
export function IssueList({ importId }: { importId: string }) {
  const [severity, setSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ rows: IssueRow[]; total: number } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const result = await issuesPageAction({ importId, severity: severity === 'all' ? null : severity, page });
      setData(result.ok ? result.data : { rows: [], total: 0 });
    });
  }, [importId, severity, page]);

  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE));
  return (
    <div className={cn('flex flex-col gap-3', pending && 'opacity-60')}>
      <Segmented
        value={severity}
        onChange={(value) => {
          setSeverity(value);
          setPage(0);
        }}
        label="Filtrar problemas"
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'error', label: 'Erros' },
          { value: 'warning', label: 'Avisos' },
        ]}
      />
      <div className="rounded-lg border">
        <Table scrollLabel="Tabela: problemas por linha">
          <caption className="sr-only">Problemas encontrados por linha do arquivo</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 bg-muted/40 text-right text-xs">Linha</TableHead>
              <TableHead className="bg-muted/40 text-xs">Problema</TableHead>
              <TableHead className="bg-muted/40 text-xs">Valor no arquivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.rows ?? []).map((row, index) => (
              <TableRow key={`${row.rowNumber}-${index}`}>
                <TableCell className="text-right text-xs tabular text-subtle-foreground">{row.rowNumber ?? '—'}</TableCell>
                <TableCell className={cn('text-sm', row.severity === 'error' ? 'text-critical-text' : 'text-warning-text')}>{row.message}</TableCell>
                <TableCell className="max-w-56 truncate text-sm text-muted-foreground" translate="no">
                  {row.rawValue ?? '—'}
                </TableCell>
              </TableRow>
            ))}
            {data && data.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum problema com esse filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span aria-live="polite">
          {formatNumber(data?.total ?? 0)} no total, página {page + 1} de {pages}
        </span>
        <span className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0 || pending} aria-label="Página anterior">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setPage((value) => Math.min(pages - 1, value + 1))} disabled={page >= pages - 1 || pending} aria-label="Próxima página">
            <ChevronRight aria-hidden="true" />
          </Button>
        </span>
      </div>
    </div>
  );
}

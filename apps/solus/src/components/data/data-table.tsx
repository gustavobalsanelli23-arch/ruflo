'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Segmented } from './segmented';
import { EmptyState } from './states';

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  align?: 'left' | 'right';
  className?: string;
  /** Hidden below the lg breakpoint (the mobile card shows the essentials). */
  wide?: boolean;
}

export interface TableFilter<T> {
  id: string;
  label: string;
  predicate: (row: T) => boolean;
}

type SortState = { id: string; dir: 'asc' | 'desc' } | null;

/**
 * The analytical table. Inside a Panel it bleeds to the panel edges so rows
 * read edge to edge; numbers align right in tabular figures; sorting shows
 * its arrow only where it applies; phones get a list of row summaries.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  caption,
  noun = { one: 'item', many: 'itens' },
  searchText,
  searchPlaceholder = 'Buscar…',
  filters,
  initialSort = null,
  pageSize = 10,
  mobileRow,
  onRowSelect,
  selectedId,
  toolbar,
  rowClassName,
  bleed = true,
  filterValue,
  onFilterChange,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  caption: string;
  noun?: { one: string; many: string };
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: TableFilter<T>[];
  initialSort?: SortState;
  pageSize?: number;
  mobileRow?: (row: T) => React.ReactNode;
  onRowSelect?: (row: T) => void;
  selectedId?: string | null;
  toolbar?: React.ReactNode;
  /** Discreet emphasis for rows that need attention (never colour alone: pair with a status cell). */
  rowClassName?: (row: T) => string | undefined;
  /** Extend rows to the edges of the surrounding Panel (its 20px padding). */
  bleed?: boolean;
  /** Controlled filter, for screens that keep it in the URL. */
  filterValue?: string;
  onFilterChange?: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [ownFilter, setOwnFilter] = useState(filters?.[0]?.id ?? 'all');
  const filter = filterValue ?? ownFilter;
  const setFilter = (id: string) => {
    if (filterValue === undefined) setOwnFilter(id);
    onFilterChange?.(id);
  };
  const [sort, setSort] = useState<SortState>(initialSort);
  const [page, setPage] = useState(0);

  const counts = useMemo(
    () => Object.fromEntries((filters ?? []).map((f) => [f.id, rows.filter(f.predicate).length])),
    [filters, rows],
  );

  const visible = useMemo(() => {
    const active = filters?.find((f) => f.id === filter);
    const needle = deferredQuery.trim().toLocaleLowerCase('pt-BR');
    let result = rows.filter((row) => (active ? active.predicate(row) : true));
    if (needle && searchText) result = result.filter((row) => searchText(row).toLocaleLowerCase('pt-BR').includes(needle));
    const column = sort ? columns.find((c) => c.id === sort.id) : undefined;
    if (sort && column?.sortValue) {
      const get = column.sortValue;
      result = [...result].sort((a, b) => {
        const x = get(a);
        const y = get(b);
        const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
        return sort.dir === 'asc' ? order : -order;
      });
    }
    return result;
  }, [rows, filters, filter, deferredQuery, searchText, sort, columns]);

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = visible.slice(current * pageSize, current * pageSize + pageSize);
  const from = visible.length === 0 ? 0 : current * pageSize + 1;
  const to = Math.min(visible.length, (current + 1) * pageSize);

  const toggleSort = (id: string) => {
    setPage(0);
    setSort((previous) => {
      if (!previous || previous.id !== id) return { id, dir: 'desc' };
      if (previous.dir === 'desc') return { id, dir: 'asc' };
      return null;
    });
  };

  const clear = () => {
    setQuery('');
    setFilter(filters?.[0]?.id ?? 'all');
    setPage(0);
  };

  const countLabel = `${formatNumber(visible.length)} ${visible.length === 1 ? noun.one : noun.many}`;
  const edge = bleed ? '-mx-5' : '';

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {(filters || searchText || toolbar) && (
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {filters ? (
            <Segmented
              value={filter}
              onChange={(value) => {
                setFilter(value);
                setPage(0);
              }}
              label="Filtrar tabela"
              options={filters.map((f) => ({ value: f.id, label: f.label, count: counts[f.id] }))}
            />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {searchText && (
              <label className="relative block w-full md:w-72">
                <span className="sr-only">{searchPlaceholder}</span>
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" />
                <Input
                  type="search"
                  name="busca"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="h-9 bg-card pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Limpar busca"
                    className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-subtle-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                )}
              </label>
            )}
            {toolbar}
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {countLabel}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed">
          <EmptyState
            icon={Search}
            title="Nada encontrado com esses filtros"
            description="Limpe a busca ou escolha outro filtro para ver os itens."
            action={
              <Button variant="outline" size="sm" onClick={clear}>
                Limpar filtros
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {mobileRow && (
            <ul className={cn('flex flex-col divide-y border-y md:hidden', edge)}>
              {slice.map((row) => (
                <li key={getRowId(row)} className={rowClassName?.(row)}>
                  {onRowSelect ? (
                    <button
                      type="button"
                      onClick={() => onRowSelect(row)}
                      className="block w-full px-5 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                    >
                      {mobileRow(row)}
                    </button>
                  ) : (
                    <div className="px-5 py-3">{mobileRow(row)}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className={cn('min-w-0 border-y', edge, mobileRow && 'hidden md:block')}>
            <Table className="[&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5">
              <caption className="sr-only">{caption}</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => {
                    const sorted = sort?.id === column.id ? sort.dir : null;
                    return (
                      <TableHead
                        key={column.id}
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                        className={cn(
                          'h-10 px-3 text-xs font-medium text-muted-foreground',
                          column.align === 'right' && 'text-right',
                          column.wide && 'hidden lg:table-cell',
                          column.className,
                        )}
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.id)}
                            className={cn(
                              'group/sort -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
                              sorted && 'text-foreground',
                              column.align === 'right' && 'flex-row-reverse',
                            )}
                          >
                            {column.header}
                            {sorted === 'asc' ? (
                              <ArrowUp aria-hidden="true" className="size-3.5 text-brand" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown aria-hidden="true" className="size-3.5 text-brand" />
                            ) : (
                              <ArrowUpDown
                                aria-hidden="true"
                                className="size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60"
                              />
                            )}
                          </button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((row) => {
                  const id = getRowId(row);
                  return (
                    <TableRow
                      key={id}
                      data-state={selectedId === id ? 'selected' : undefined}
                      onClick={onRowSelect ? () => onRowSelect(row) : undefined}
                      className={cn('hover:bg-accent/60', onRowSelect && 'cursor-pointer', rowClassName?.(row))}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          className={cn(
                            'px-3 py-3 tabular',
                            column.align === 'right' && 'text-right',
                            column.wide && 'hidden lg:table-cell',
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {visible.length > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="tabular">
            {visible.length > pageSize ? (
              <>
                {formatNumber(from)}–{formatNumber(to)} de {countLabel}
              </>
            ) : (
              countLabel
            )}
          </span>
          {visible.length > pageSize && (
            <nav aria-label="Paginação" className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Página anterior">
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span className="px-2 text-xs tabular" aria-live="polite">
                Página {current + 1} de {pages}
              </span>
              <Button variant="outline" size="icon-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Próxima página">
                <ChevronRight aria-hidden="true" />
              </Button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}

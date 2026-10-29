'use client';

import { DataTable, type Column } from '@/components/data/data-table';
import { Delta } from '@/components/data/delta';
import { MARGIN_BAND, StatusBadge } from '@/components/data/status';
import type { ProductProfit } from '@/lib/data/types';
import { formatCurrency, formatNumber, formatPercent, formatRatio, relativeChange } from '@/lib/format';

/** Margin changes under a tenth of a point are noise in a table of 44 rows. */
const MEANINGFUL_POINTS = 0.001;

const money = (value: number) => formatCurrency(value, { whole: true });

const columns: Column<ProductProfit>[] = [
  {
    id: 'name',
    header: 'Produto',
    sortValue: (p) => p.name,
    className: 'min-w-56',
    cell: (p) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{p.name}</p>
        <p className="text-xs text-subtle-foreground">
          <span translate="no">{p.sku}</span>, {p.category}
        </p>
      </div>
    ),
  },
  { id: 'supplier', header: 'Fornecedor', sortValue: (p) => p.supplier, wide: true, cell: (p) => <span className="text-muted-foreground">{p.supplier}</span> },
  { id: 'units', header: 'Unidades', align: 'right', sortValue: (p) => p.unitsSold, wide: true, cell: (p) => <span className="text-muted-foreground">{formatNumber(p.unitsSold)}</span> },
  {
    id: 'revenue',
    header: 'Receita',
    align: 'right',
    sortValue: (p) => p.revenue,
    cell: (p) => (
      <span className="inline-flex flex-col items-end gap-0.5">
        <span className="text-foreground">{money(p.revenue)}</span>
        <Delta size="xs" value={relativeChange(p.revenue, p.previousRevenue)} />
      </span>
    ),
  },
  {
    id: 'cost',
    header: 'Custo',
    align: 'right',
    sortValue: (p) => (p.band === 'unknown' ? -1 : p.revenue - p.grossProfit),
    cell: (p) => <span className="text-muted-foreground">{p.band === 'unknown' ? 'sem custo' : money(p.revenue - p.grossProfit)}</span>,
  },
  {
    id: 'profit',
    header: 'Lucro bruto',
    align: 'right',
    sortValue: (p) => p.grossProfit,
    cell: (p) => <span className="font-semibold text-foreground">{money(p.grossProfit)}</span>,
  },
  {
    id: 'margin',
    header: 'Margem',
    align: 'right',
    sortValue: (p) => p.margin ?? -Infinity,
    cell: (p) => {
      const change = p.margin !== null && p.previousMargin !== null ? p.margin - p.previousMargin : 0;
      return (
        <span className="inline-flex flex-col items-end gap-0.5">
          <span className="text-foreground">{formatRatio(p.margin)}</span>
          {Math.abs(change) >= MEANINGFUL_POINTS && <Delta size="xs" kind="points" value={change} />}
        </span>
      );
    },
  },
  { id: 'band', header: 'Situação', sortValue: (p) => p.margin ?? -Infinity, cell: (p) => <StatusBadge spec={MARGIN_BAND[p.band]} /> },
];

export function ProductsTable({ products, threshold }: { products: ProductProfit[]; threshold: number }) {
  return (
    <DataTable
      rows={products}
      columns={columns}
      getRowId={(p) => p.productId}
      caption="Receita, custo, lucro bruto e margem por produto"
      noun={{ one: 'produto', many: 'produtos' }}
      searchText={(p) => `${p.name} ${p.sku} ${p.category} ${p.supplier}`}
      searchPlaceholder="Buscar produto, SKU ou fornecedor…"
      initialSort={{ id: 'profit', dir: 'desc' }}
      rowClassName={(p) => (p.band === 'negative' ? 'bg-critical-soft/60 hover:bg-critical-soft' : undefined)}
      filters={[
        { id: 'all', label: 'Todos', predicate: () => true },
        { id: 'attention', label: 'Margem em alerta', predicate: (p) => p.band === 'low' || p.band === 'negative' },
        { id: 'low', label: `Baixa (0 a ${formatPercent(threshold, 0)})`, predicate: (p) => p.band === 'low' },
        { id: 'negative', label: 'Negativa', predicate: (p) => p.band === 'negative' },
      ]}
      mobileRow={(p) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular">
              Receita {money(p.revenue)}, lucro {money(p.grossProfit)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular">{formatRatio(p.margin)}</p>
            <StatusBadge spec={MARGIN_BAND[p.band]} className="mt-1" />
          </div>
        </div>
      )}
    />
  );
}

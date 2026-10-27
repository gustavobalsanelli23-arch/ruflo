'use client';

import { DataTable, type Column } from '@/components/data/data-table';
import { Delta } from '@/components/data/delta';
import { MARGIN_BAND, StatusBadge } from '@/components/data/status';
import type { ProductProfit } from '@/lib/data/types';
import { formatCurrency, formatNumber, formatPercent, relativeChange } from '@/lib/format';

const columns: Column<ProductProfit>[] = [
  {
    id: 'name',
    header: 'Produto',
    sortValue: (p) => p.name,
    className: 'min-w-56',
    cell: (p) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{p.name}</p>
        <p className="text-xs text-subtle-foreground" translate="no">
          {p.sku}
        </p>
      </div>
    ),
  },
  { id: 'category', header: 'Categoria', sortValue: (p) => p.category, wide: true, cell: (p) => <span className="text-muted-foreground">{p.category}</span> },
  { id: 'supplier', header: 'Fornecedor', sortValue: (p) => p.supplier, wide: true, cell: (p) => <span className="text-muted-foreground">{p.supplier}</span> },
  { id: 'units', header: 'Unidades', align: 'right', sortValue: (p) => p.unitsSold, cell: (p) => formatNumber(p.unitsSold) },
  { id: 'revenue', header: 'Receita', align: 'right', sortValue: (p) => p.revenue, cell: (p) => formatCurrency(p.revenue, { whole: true }) },
  {
    id: 'change',
    header: 'Var. receita',
    align: 'right',
    sortValue: (p) => relativeChange(p.revenue, p.previousRevenue) ?? -Infinity,
    cell: (p) => <Delta size="xs" value={relativeChange(p.revenue, p.previousRevenue)} />,
  },
  {
    id: 'profit',
    header: 'Lucro bruto',
    align: 'right',
    sortValue: (p) => p.grossProfit,
    cell: (p) => (
      <span className={p.grossProfit < 0 ? 'font-medium text-critical-text' : 'font-medium text-foreground'}>
        {formatCurrency(p.grossProfit, { whole: true })}
      </span>
    ),
  },
  {
    id: 'margin',
    header: 'Margem',
    align: 'right',
    sortValue: (p) => p.margin,
    cell: (p) => (
      <span className="inline-flex flex-col items-end gap-0.5">
        <span className="font-medium text-foreground">{formatPercent(p.margin)}</span>
        <Delta size="xs" kind="points" value={p.margin - p.previousMargin} />
      </span>
    ),
  },
  { id: 'band', header: 'Situação', sortValue: (p) => p.margin, cell: (p) => <StatusBadge spec={MARGIN_BAND[p.band]} /> },
];

export function ProductsTable({ products, threshold }: { products: ProductProfit[]; threshold: number }) {
  return (
    <DataTable
      rows={products}
      columns={columns}
      getRowId={(p) => p.productId}
      caption="Receita, lucro bruto e margem por produto"
      noun={{ one: 'produto', many: 'produtos' }}
      searchText={(p) => `${p.name} ${p.sku} ${p.category} ${p.supplier}`}
      searchPlaceholder="Buscar produto, SKU ou fornecedor…"
      initialSort={{ id: 'profit', dir: 'desc' }}
      filters={[
        { id: 'all', label: 'Todos', predicate: () => true },
        { id: 'low', label: `Baixa (0 a ${formatPercent(threshold, 0)})`, predicate: (p) => p.band === 'low' },
        { id: 'negative', label: 'Negativa', predicate: (p) => p.band === 'negative' },
      ]}
      mobileRow={(p) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatCurrency(p.revenue, { whole: true })} de receita, {formatNumber(p.unitsSold)} un.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular">{formatPercent(p.margin)}</p>
            <StatusBadge spec={MARGIN_BAND[p.band]} className="mt-1" />
          </div>
        </div>
      )}
    />
  );
}

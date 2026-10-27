'use client';

import { DataTable, type Column } from '@/components/data/data-table';
import { Meter } from '@/components/data/meter';
import { STOCK_STATUS, StatusBadge } from '@/components/data/status';
import type { ProductStock } from '@/lib/data/types';
import { formatCurrency, formatDays, formatDecimal, formatNumber } from '@/lib/format';

function Coverage({ item }: { item: ProductStock }) {
  if (item.coverageDays === null) return <span className="text-warning-text">Sem venda</span>;
  const tone = item.status === 'rupture-risk' ? 'critical' : item.status === 'low-turnover' ? 'warning' : 'positive';
  return (
    <span className="inline-flex w-28 flex-col items-end gap-1">
      <span className="text-foreground">{formatDays(item.coverageDays)}</span>
      <Meter
        value={Math.min(item.coverageDays, 120)}
        max={120}
        tone={tone}
        label={`Cobertura de ${formatDays(item.coverageDays)}, prazo de reposição de ${formatDays(item.leadTimeDays)}`}
      />
    </span>
  );
}

const columns: Column<ProductStock>[] = [
  {
    id: 'name',
    header: 'Produto',
    sortValue: (s) => s.name,
    className: 'min-w-56',
    cell: (s) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{s.name}</p>
        <p className="text-xs text-subtle-foreground">{s.category}</p>
      </div>
    ),
  },
  { id: 'onHand', header: 'Em estoque', align: 'right', sortValue: (s) => s.onHand, cell: (s) => `${formatNumber(s.onHand)} un.` },
  { id: 'value', header: 'Valor a custo', align: 'right', sortValue: (s) => s.stockValue, cell: (s) => formatCurrency(s.stockValue, { whole: true }) },
  { id: 'daily', header: 'Venda/dia', align: 'right', sortValue: (s) => s.dailyUnits, wide: true, cell: (s) => formatDecimal(s.dailyUnits) },
  { id: 'coverage', header: 'Cobertura', align: 'right', sortValue: (s) => s.coverageDays ?? 9999, cell: (s) => <Coverage item={s} /> },
  { id: 'lead', header: 'Prazo', align: 'right', sortValue: (s) => s.leadTimeDays, wide: true, cell: (s) => formatDays(s.leadTimeDays) },
  { id: 'turnover', header: 'Giro anual', align: 'right', sortValue: (s) => s.turnover, wide: true, cell: (s) => `${formatDecimal(s.turnover)}×` },
  {
    id: 'idle',
    header: 'Última venda',
    align: 'right',
    sortValue: (s) => s.daysSinceLastSale,
    wide: true,
    cell: (s) => (s.daysSinceLastSale === 0 ? 'Hoje' : `há ${formatDays(s.daysSinceLastSale)}`),
  },
  { id: 'status', header: 'Situação', sortValue: (s) => s.status, cell: (s) => <StatusBadge spec={STOCK_STATUS[s.status]} /> },
];

export function StockTable({ items }: { items: ProductStock[] }) {
  return (
    <DataTable
      rows={items}
      columns={columns}
      getRowId={(s) => s.productId}
      caption="Posição de estoque por produto"
      noun={{ one: 'item', many: 'itens' }}
      searchText={(s) => `${s.name} ${s.sku} ${s.category}`}
      searchPlaceholder="Buscar produto ou categoria…"
      initialSort={{ id: 'value', dir: 'desc' }}
      filters={[
        { id: 'attention', label: 'Precisam de atenção', predicate: (s) => s.status !== 'healthy' },
        { id: 'rupture', label: 'Ruptura', predicate: (s) => s.status === 'rupture-risk' },
        { id: 'stalled', label: 'Parados', predicate: (s) => s.status === 'stalled' },
        { id: 'slow', label: 'Baixo giro', predicate: (s) => s.status === 'low-turnover' },
        { id: 'all', label: 'Todos', predicate: () => true },
      ]}
      mobileRow={(s) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatNumber(s.onHand)} un., {formatCurrency(s.stockValue, { whole: true })}
              {s.coverageDays !== null && `, cobre ${formatDays(s.coverageDays)}`}
            </p>
          </div>
          <StatusBadge spec={STOCK_STATUS[s.status]} className="shrink-0" />
        </div>
      )}
    />
  );
}

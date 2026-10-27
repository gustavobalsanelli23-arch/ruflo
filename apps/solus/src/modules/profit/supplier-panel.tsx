import { TriangleAlert } from 'lucide-react';
import { Panel } from '@/components/data/panel';
import type { SupplierProfit } from '@/lib/data/types';
import { formatCurrency, formatPercent, pluralize } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Gross profit per supplier as bars (magnitude), margin as the second read. */
export function SupplierPanel({ suppliers, threshold }: { suppliers: SupplierProfit[]; threshold: number }) {
  const max = Math.max(...suppliers.map((s) => s.grossProfit));
  return (
    <Panel title="Rentabilidade por fornecedor" description="Lucro bruto gerado no período e margem média dos itens de cada fornecedor.">
      <ul className="flex flex-col gap-3.5">
        {suppliers.map((supplier) => {
          const weak = supplier.margin < threshold + 0.1;
          return (
            <li key={supplier.supplierId}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-foreground">
                  {supplier.name}
                  <span className="ml-2 text-xs text-subtle-foreground">{pluralize(supplier.productCount, 'item', 'itens')}</span>
                </p>
                <p className="shrink-0 text-sm tabular">
                  <span className="font-semibold text-foreground">{formatCurrency(supplier.grossProfit, { compact: true, whole: true })}</span>
                  <span className={cn('ml-2 inline-flex items-center gap-1', weak ? 'text-warning-text' : 'text-muted-foreground')}>
                    {weak && <TriangleAlert aria-label="Margem próxima do corte" className="size-3.5" />}
                    {formatPercent(supplier.margin)}
                  </span>
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-soft" aria-hidden="true">
                <div className="h-full rounded-full bg-series-1" style={{ width: `${(supplier.grossProfit / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

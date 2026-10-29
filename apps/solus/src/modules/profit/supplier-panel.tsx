import { TriangleAlert } from 'lucide-react';
import { Panel } from '@/components/data/panel';
import type { SupplierProfit } from '@/lib/data/types';
import { formatCurrency, formatPercent, formatRatio, pluralize } from '@/lib/format';

/** Gross profit per supplier as bars (magnitude), margin as the second read. */
export function SupplierPanel({ suppliers, threshold }: { suppliers: SupplierProfit[]; threshold: number }) {
  const max = Math.max(1, ...suppliers.map((s) => s.grossProfit));
  return (
    <Panel
      title="Rentabilidade por fornecedor"
      description="Lucro bruto gerado no período (barra) e margem média dos itens de cada fornecedor."
      footer={
        <p className="flex items-center gap-1.5 text-xs text-subtle-foreground">
          <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" />
          Margem a menos de 10 pontos do corte de {formatPercent(threshold, 0)}.
        </p>
      }
      className="h-full"
    >
      <ul className="flex flex-col gap-3.5">
        {suppliers.map((supplier) => {
          const weak = supplier.margin !== null && supplier.margin < threshold + 0.1;
          return (
            <li key={supplier.supplierId}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-foreground">
                  {supplier.name}
                  <span className="ml-2 text-xs text-subtle-foreground">{pluralize(supplier.productCount, 'item', 'itens')}</span>
                </p>
                <p className="shrink-0 text-sm tabular">
                  <span className="font-semibold text-foreground">{formatCurrency(supplier.grossProfit, { compact: true, whole: true })}</span>
                  <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                    {weak && <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" />}
                    {formatRatio(supplier.margin)}
                    {weak && <span className="sr-only">, margem próxima do corte</span>}
                  </span>
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-soft" aria-hidden="true">
                <div className="h-full rounded-full bg-series-1" style={{ width: `${(Math.max(supplier.grossProfit, 0) / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

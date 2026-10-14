'use client';

import type { OrderTotals } from '@/lib/orders';
import { formatPrice } from '@/lib/format';

/** Produtos, promoções, subtotal e total (algarismos tabulares). O frete é cobrado na Stripe. */
export function TotalsTable({ totals, itemCount }: { totals: OrderTotals; itemCount: number }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4 text-fg-2">
        <dt>
          Produtos ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
        </dt>
        <dd className="tabular-nums">{formatPrice(totals.products)}</dd>
      </div>
      {totals.promoSavings > 0 && (
        <div className="flex justify-between gap-4 text-success">
          <dt>Promoções</dt>
          <dd className="tabular-nums">− {formatPrice(totals.promoSavings)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4 text-fg-2">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4 text-fg-2">
        <dt>Frete</dt>
        <dd className="text-right text-muted">Calculado no pagamento</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <dt className="font-semibold text-fg">Total dos produtos</dt>
        <dd className="text-2xl font-extrabold tabular-nums text-fg">{formatPrice(totals.total)}</dd>
      </div>
    </dl>
  );
}

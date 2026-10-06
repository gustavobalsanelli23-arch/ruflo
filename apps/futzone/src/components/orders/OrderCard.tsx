'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Order } from '@/types/commerce';
import { cn, formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orders';
import { Badge } from '@/components/ui/Badge';

export function OrderStatusBadge({ status }: { status: Order['status'] }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

const STEPS: Order['status'][] = ['pendente', 'preparacao', 'enviado', 'entregue'];

/** Cartão de pedido (área do cliente e visão mobile do painel). */
export function OrderCard({ order, showCustomer, actions }: { order: Order; showCustomer?: boolean; actions?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const items = order.lines.reduce((n, l) => n + l.quantity, 0);
  const stepIndex = STEPS.indexOf(order.status);

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left transition-colors hover:bg-surface-2/60 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-brand-300">{order.number}</p>
          <p className="text-xs text-muted">
            {formatDateTime(order.createdAt)} · {items} {items === 1 ? 'item' : 'itens'}
            {showCustomer && <> · {order.customerName}</>}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
        <p className="w-24 text-right font-extrabold tabular-nums">{formatPrice(order.total)}</p>
        <ChevronDown className={cn('size-4 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="animate-fade border-t border-line p-4 sm:p-5">
          {order.status !== 'cancelado' && (
            <ol className="mb-5 grid grid-cols-4 gap-2" aria-label="Andamento do pedido">
              {STEPS.map((s, i) => (
                <li key={s} className="text-center">
                  <span className={cn('mb-2 block h-1 rounded-full', i <= stepIndex ? 'bg-brand-500' : 'bg-surface-3')} />
                  <span className={cn('text-[0.65rem] uppercase tracking-wider', i <= stepIndex ? 'text-fg-2' : 'text-subtle')}>{ORDER_STATUS_META[s].label}</span>
                </li>
              ))}
            </ol>
          )}
          <ul className="divide-y divide-line text-sm">
            {order.lines.map((l) => (
              <li key={l.productId + l.size} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate">{l.name}</span>
                  <span className="text-xs text-muted">
                    Tam. {l.size} · {l.quantity} × {formatPrice(l.unitPrice)}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          {actions && <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">{actions}</div>}
        </div>
      )}
    </article>
  );
}

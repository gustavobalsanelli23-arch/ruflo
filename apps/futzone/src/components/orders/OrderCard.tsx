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

/**
 * Cartão de pedido expansível (visão mobile do painel). Usa só classes de
 * raio do tema (rounded-xl, rounded-sm): fica quase reto dentro da loja e
 * mantém o visual do painel fora dela.
 */
export function OrderCard({ order, showCustomer, actions }: { order: Order; showCustomer?: boolean; actions?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const items = order.lines.reduce((n, l) => n + l.quantity, 0);
  const stepIndex = STEPS.indexOf(order.status);

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left transition-colors duration-150 hover:bg-surface-2/60 focus-visible:outline-offset-[-2px] sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <p className="font-bold text-fg">{order.number}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
            <span className="tabular-nums">{formatDateTime(order.createdAt)}</span>
            <span>
              {items} {items === 1 ? 'item' : 'itens'}
            </span>
            {showCustomer && <span>{order.customerName}</span>}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
        <p className="w-24 text-right font-extrabold tabular-nums">{formatPrice(order.total)}</p>
        <ChevronDown aria-hidden strokeWidth={1.75} className={cn('size-4 text-muted transition-transform duration-200 ease-[var(--ease-out-fz)]', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="animate-fade border-t border-line p-4 sm:p-5">
          {order.status !== 'cancelado' && (
            <ol className="mb-5 grid grid-cols-4 gap-2" aria-label="Andamento do pedido">
              {STEPS.map((s, i) => (
                <li key={s} className="text-center" aria-current={i === stepIndex ? 'step' : undefined}>
                  <span className={cn('mb-2 block h-1 rounded-sm', i <= stepIndex ? 'bg-brand-500' : 'bg-surface-3')} />
                  <span className={cn('text-[0.6875rem] uppercase tracking-wider', i <= stepIndex ? 'text-fg-2' : 'text-muted')}>{ORDER_STATUS_META[s].label}</span>
                </li>
              ))}
            </ol>
          )}
          <ul className="divide-y divide-line text-sm">
            {order.lines.map((l) => (
              <li key={l.productId + l.size} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate">{l.name}</span>
                  <span className="flex flex-wrap gap-x-3 text-xs text-muted">
                    <span>Tam. {l.size}</span>
                    <span className="tabular-nums">
                      {l.quantity} × {formatPrice(l.unitPrice)}
                    </span>
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

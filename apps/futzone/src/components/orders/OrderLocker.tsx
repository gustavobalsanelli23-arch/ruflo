'use client';

import { ArrowRight } from 'lucide-react';
import type { Order } from '@/types/commerce';
import { cn, formatPrice, formatShortDate } from '@/lib/format';
import { ORDER_STATUS_META, orderItemsCount } from '@/lib/orders';
import { LinkButton } from '@/components/ui/Button';
import { OrderProgress } from './OrderTimeline';

/** Lâmpada de estado (quadradinha, como a do estoque): a cor é o único sinal semântico. */
const STATUS_LED: Record<Order['status'], string> = {
  pendente: 'bg-warn',
  preparacao: 'bg-light',
  enviado: 'bg-light',
  entregue: 'bg-success',
  cancelado: 'bg-danger',
};

/** Situação do pedido na loja: lâmpada e rótulo. O painel continua com o OrderStatusBadge. */
export function OrderStatusTag({ status, size = 'sm', className }: { status: Order['status']; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap font-bold uppercase text-fg',
        size === 'md' ? 'text-[0.8125rem] tracking-[0.14em]' : 'text-[0.6875rem] tracking-[0.12em]',
        className,
      )}
    >
      <span aria-hidden className={cn('shrink-0 rounded-[1px]', size === 'md' ? 'size-2' : 'size-[7px]', STATUS_LED[status])} />
      {ORDER_STATUS_META[status].label}
    </span>
  );
}

interface OrderLockerProps {
  order: Order;
  /** h2 na lista de pedidos; h3 quando o armário fica dentro de uma seção (painel da conta). */
  headingLevel?: 'h2' | 'h3';
}

/**
 * Pedido como armário do vestiário: a plaquinha (número e data), as camisas
 * do pedido, a situação, o valor, a barra de estações e a ação "Ver pedido".
 */
export function OrderLocker({ order, headingLevel = 'h2' }: OrderLockerProps) {
  const Heading = headingLevel;
  const items = orderItemsCount(order);
  const thumbs = order.lines.slice(0, 4);
  const more = order.lines.length - thumbs.length;

  return (
    <article className="locker rounded-[var(--radius-card)]">
      <div className="flex h-10 items-center justify-between gap-3 border-b border-line px-4">
        <Heading className="plate truncate text-[0.82rem] text-fg">Pedido {order.number}</Heading>
        <span className="plate shrink-0 text-[0.74rem] tabular-nums text-muted">
          <span className="sr-only">Feito em </span>
          {formatShortDate(order.createdAt)}
        </span>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6 sm:p-5">
        {/* As camisas do pedido (os nomes estão no detalhe) */}
        <div aria-hidden className="flex items-center gap-1.5">
          {thumbs.map((l) =>
            l.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={l.productId + l.size} src={l.image} alt="" width={720} height={960} loading="lazy" decoding="async" className="h-20 w-15 rounded-[2px] bg-[#0a0c10] object-cover" />
            ) : (
              <span key={l.productId + l.size} className="h-20 w-15 rounded-[2px] bg-steel-3" />
            ),
          )}
          {more > 0 && <span className="pl-1 text-xs tabular-nums text-muted">+{more}</span>}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <OrderStatusTag status={order.status} />
            <p className="flex items-baseline gap-2 text-sm">
              <span className="font-bold tabular-nums text-fg">{formatPrice(order.total)}</span>
              <span className="text-muted">
                {items} {items === 1 ? 'item' : 'itens'}
              </span>
            </p>
          </div>
          <OrderProgress order={order} />
          <LinkButton href={`/conta/pedidos/${order.id}`} variant="secondary" size="sm" className="w-full sm:w-auto sm:self-end">
            Ver pedido <span className="sr-only">{order.number}</span>
            <ArrowRight className="size-3.5" strokeWidth={1.75} aria-hidden />
          </LinkButton>
        </div>
      </div>
    </article>
  );
}

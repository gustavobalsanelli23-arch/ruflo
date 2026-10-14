'use client';

import { ExternalLink } from 'lucide-react';
import type { Order } from '@/types/commerce';
import { paymentUrl } from '@/lib/paymentLinks';
import { cn, formatPrice } from '@/lib/format';
import { buttonClass } from '@/components/ui/Button';

/** O pedido ainda tem pagamento a fazer pelos links da Stripe? */
export const awaitingLinkPayment = (order: Order) => order.status !== 'cancelado' && order.payment?.status === 'pendente' && !!order.payment.links?.length;

/**
 * Pagamentos do pedido nos links da Stripe: um por tipo de camisa, cada um com
 * o frete da região. O link já leva a referência do pedido e o e-mail.
 */
export function PaymentLinks({ order, className }: { order: Order; className?: string }) {
  const groups = order.payment?.links ?? [];
  if (!awaitingLinkPayment(order)) return null;
  const several = groups.length > 1;
  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-sm leading-relaxed text-fg-2">
        {several
          ? `Seu pedido tem camisas de ${groups.length} tipos: faça os ${groups.length} pagamentos abaixo. Cada um abre a página segura da Stripe (Pix ou cartão), com o frete da sua região.`
          : 'O pagamento abre a página segura da Stripe (Pix ou cartão). Lá você informa o endereço de entrega e escolhe o frete da sua região.'}
      </p>
      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
        {groups.map((g, i) => (
          <li key={g.reference} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-fg">
                {several && <span className="text-muted">{i + 1}. </span>}
                {g.label} <span className="font-normal text-muted">× {g.quantity}</span>
              </p>
              <p className="mt-0.5 tabular-nums text-fg-2">
                {formatPrice(g.amount)} <span className="text-muted">+ frete</span>
              </p>
              {g.quantity > 1 && <p className="mt-1 text-xs font-semibold text-warn">Na Stripe, ajuste a quantidade para {g.quantity}.</p>}
              <p className="mt-1 text-xs text-muted">Referência {g.reference}</p>
            </div>
            <a href={paymentUrl(g, order.customerEmail)} target="_blank" rel="noopener noreferrer" className={buttonClass({ size: 'md', className: 'w-full sm:w-auto' })}>
              Pagar <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

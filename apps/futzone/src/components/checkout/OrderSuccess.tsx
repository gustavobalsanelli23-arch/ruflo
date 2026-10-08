'use client';

import { ArrowRight, Check, CreditCard, MapPin, Package, Truck } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { formatAddress, PAYMENT_STATUS_META } from '@/lib/orders';
import { formatDateTime, formatPrice } from '@/lib/format';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Skeleton } from '@/components/ui/Skeleton';

export function OrderSuccess({ orderId }: { orderId: string }) {
  const { orders, hydrated } = useStoreData();
  const { customer, status } = useCustomerAuth();
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    if (!hydrated || status === 'loading') return <Skeleton className="mx-auto h-96 max-w-2xl rounded-3xl" />;
    return <EmptyState icon={<Package className="size-6" />} title="Pedido não encontrado" description="Não encontramos este pedido neste navegador." action={<LinkButton href="/camisas">Continuar comprando</LinkButton>} />;
  }

  const mine = !!customer && order.customerId === customer.id;
  const viewHref = mine ? `/conta/pedidos/${order.id}` : `/cadastro?email=${encodeURIComponent(order.customerEmail ?? '')}&next=${encodeURIComponent(`/conta/pedidos/${order.id}`)}`;
  const s = order.shipping;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center text-center">
        <span className="relative grid size-20 place-items-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
          <span className="absolute inset-0 animate-ping rounded-full bg-success/15 [animation-duration:2.2s] [animation-iteration-count:2]" aria-hidden />
          <Check className="animate-pop size-10" strokeWidth={2.5} />
        </span>
        <h1 className="animate-fade-up heading-display mt-6 text-5xl text-fg [animation-delay:120ms] sm:text-6xl">Pedido realizado com sucesso!</h1>
        <p className="animate-fade-up mt-3 text-fg-2 [animation-delay:200ms]">
          Obrigado, {order.customerName.split(' ')[0]}! Guarde o número do pedido para acompanhar a entrega.
        </p>
        <p className="animate-fade-up mt-1 text-xs text-muted [animation-delay:240ms]">A confirmação por e-mail será enviada quando o serviço de e-mail estiver ativo.</p>
      </div>

      <div className="animate-fade-up mt-10 rounded-3xl bg-surface p-6 ring-1 ring-white/[0.06] [animation-delay:280ms] sm:p-8">
        <dl className="grid grid-cols-2 gap-4 border-b border-white/[0.06] pb-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">Número do pedido</dt>
            <dd className="mt-1 font-bold text-fg">{order.number}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Data</dt>
            <dd className="mt-1 text-fg">{formatDateTime(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Valor</dt>
            <dd className="mt-1 font-bold tabular-nums text-fg">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        <ul className="space-y-5 pt-6 text-sm">
          {order.address && (
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <span>
                <span className="block text-xs text-muted">Endereço de entrega</span>
                <span className="text-fg-2">{order.address.recipient} — {formatAddress(order.address)}</span>
              </span>
            </li>
          )}
          {s && (
            <li className="flex gap-3">
              <Truck className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <span>
                <span className="block text-xs text-muted">Método de entrega</span>
                <span className="text-fg-2">
                  {s.serviceName} ({s.carrier}) · {s.price === 0 ? 'Grátis' : formatPrice(s.price)} · {formatBusinessDays(s.minDays, s.maxDays)}
                </span>
                <span className="block font-semibold text-fg">Previsão de entrega {formatDeliveryWindow(s.estimatedFrom, s.estimatedTo)}</span>
              </span>
            </li>
          )}
          <li className="flex gap-3">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-brand-400" />
            <span>
              <span className="block text-xs text-muted">Pagamento</span>
              <span className="text-fg-2">{PAYMENT_STATUS_META[order.payment?.status ?? 'aguardando_integracao'].description}</span>
            </span>
          </li>
        </ul>
      </div>

      <div className="animate-fade-up mt-8 flex flex-col gap-3 [animation-delay:360ms] sm:flex-row sm:justify-center">
        <LinkButton href={viewHref} size="lg">
          {mine ? 'Ver meu pedido' : 'Criar conta e acompanhar'} <ArrowRight className="size-4" />
        </LinkButton>
        <LinkButton href="/camisas" size="lg" variant="outline">
          Continuar comprando
        </LinkButton>
      </div>
      {!mine && <p className="mt-4 text-center text-xs text-muted">Crie a conta com o mesmo e-mail e este pedido aparece automaticamente na sua área.</p>}
    </div>
  );
}

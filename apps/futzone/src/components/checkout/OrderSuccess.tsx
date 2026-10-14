'use client';

import { ArrowRight, Check, Package } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { PAYMENT_STATUS_META } from '@/lib/orders';
import { formatDateTime, formatPrice } from '@/lib/format';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Skeleton } from '@/components/ui/Skeleton';
import { awaitingLinkPayment, PaymentLinks } from '@/components/orders/PaymentLinks';
import { addressLines } from './addressLines';

const ROW = 'grid gap-1 px-5 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 sm:px-8';

function TicketSkeleton() {
  return (
    <div role="status" aria-label="Carregando pedido" className="mx-auto max-w-3xl">
      <Skeleton className="size-12 rounded-[var(--radius-button)]" />
      <Skeleton className="mt-6 h-12 w-4/5 rounded-sm" />
      <Skeleton className="mt-4 h-4 w-3/5 rounded-sm" />
      <div className="locker mt-10 h-96 rounded-[var(--radius-card)]" aria-hidden />
    </div>
  );
}

/**
 * Confirmação do pedido: calma. Um armário aceso guarda o número do pedido em
 * estêncil, com data e valor; logo acima, os pagamentos a fazer na Stripe.
 */
export function OrderSuccess({ orderId }: { orderId: string }) {
  const { orders, hydrated } = useStoreData();
  const { customer, status } = useCustomerAuth();
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    if (!hydrated || status === 'loading') return <TicketSkeleton />;
    return (
      <>
        {/* A página sempre tem um h1; o estado vazio vem logo abaixo, como h2. */}
        <h1 className="sr-only">Confirmação do pedido</h1>
        <EmptyState
          headingLevel="h2"
          icon={<Package className="size-6" strokeWidth={1.75} aria-hidden />}
          title="Pedido não encontrado"
          description="Não encontramos este pedido neste navegador."
          action={<LinkButton href="/camisas">Continuar comprando</LinkButton>}
        />
      </>
    );
  }

  const mine = !!customer && order.customerId === customer.id;
  const viewHref = mine ? `/conta/pedidos/${order.id}` : `/cadastro?email=${encodeURIComponent(order.customerEmail ?? '')}&next=${encodeURIComponent(`/conta/pedidos/${order.id}`)}`;
  const toPay = awaitingLinkPayment(order);

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <span className="grid size-12 place-items-center rounded-[var(--radius-button)] border border-success/40 bg-success/10 text-success">
          <Check className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="heading-display mt-6 text-[2.5rem] text-fg sm:text-[3.5rem]">{toPay ? 'Pedido registrado! Agora é só pagar.' : 'Pedido realizado com sucesso!'}</h1>
        <p className="mt-4 max-w-[62ch] leading-relaxed text-fg-2">
          Obrigado, {order.customerName.split(' ')[0]}. {toPay ? 'Seu pedido está separado: conclua o pagamento para enviarmos.' : 'Guarde o número do pedido para acompanhar a entrega.'}
        </p>
      </header>

      {toPay && (
        <section className="mt-8" aria-labelledby="pagamento">
          <h2 id="pagamento" className="plate text-[1.05rem] text-fg">
            Pagamento
          </h2>
          <PaymentLinks order={order} className="mt-3" />
        </section>
      )}

      {/* O armário do pedido: a luz acende uma vez sobre o número */}
      <div className="locker relative mt-10 rounded-[var(--radius-card)]">
        <span aria-hidden className="animate-light-on pointer-events-none absolute inset-x-[12%] top-0 h-[2px] bg-light" />
        <dl className="px-5 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-9">
          <dt className="text-sm text-muted">Número do pedido</dt>
          <dd className="heading-stencil mt-3 text-[clamp(3rem,14vw,6rem)] text-fg">{order.number}</dd>
        </dl>

        <dl className="grid grid-cols-2 border-t border-line">
          <div className="px-5 py-4 sm:px-8">
            <dt className="text-xs text-muted">Data</dt>
            <dd className="mt-1 text-sm tabular-nums text-fg">{formatDateTime(order.createdAt)}</dd>
          </div>
          <div className="border-l border-line px-5 py-4 sm:px-8">
            <dt className="text-xs text-muted">{order.shipping ? 'Valor' : 'Produtos (frete à parte)'}</dt>
            <dd className="mt-1 text-sm font-bold tabular-nums text-fg">{formatPrice(order.total)}</dd>
          </div>
        </dl>

        <dl className="divide-y divide-line border-t border-line text-sm">
          {order.address && (
            <div className={ROW}>
              <dt className="text-muted">Endereço de entrega</dt>
              <dd className="leading-relaxed text-fg-2">
                <span className="block text-fg">{order.address.recipient}</span>
                {addressLines(order.address).map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div className={ROW}>
            <dt className="text-muted">Pagamento</dt>
            <dd className="leading-relaxed text-fg-2">{PAYMENT_STATUS_META[order.payment?.status ?? 'aguardando_integracao'].description}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <LinkButton href={viewHref} size="lg">
          {mine ? 'Ver meu pedido' : 'Criar conta e acompanhar'} <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
        </LinkButton>
        <LinkButton href="/camisas" size="lg" variant="outline">
          Continuar comprando
        </LinkButton>
      </div>
      {!mine && <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-muted">Crie a conta com o mesmo e-mail e este pedido aparece automaticamente na sua área.</p>}
    </div>
  );
}

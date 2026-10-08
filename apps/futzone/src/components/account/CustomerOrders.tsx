'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CircleHelp, CreditCard, Package, XCircle } from 'lucide-react';
import type { Order } from '@/types/commerce';
import { useCustomerOrders } from '@/hooks/useAccountData';
import { useStoreData } from '@/context/StoreDataContext';
import { useCurrentCustomer } from '@/context/CustomerAuthContext';
import { cn, formatDateTime, formatPrice, formatShortDate } from '@/lib/format';
import { orderItemsCount, PAYMENT_STATUS_META } from '@/lib/orders';
import { site } from '@/data/site';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Chip } from '@/components/ui/Form';
import { OrderStatusBadge } from '@/components/orders/OrderCard';
import { OrderProgress, OrderTimeline } from '@/components/orders/OrderTimeline';
import { TrackingCard } from '@/components/orders/TrackingCard';
import { OrderDelivery, OrderItems, OrderTotals } from '@/components/orders/OrderSummaryBlocks';

type Filter = 'todos' | 'andamento' | 'concluidos' | 'cancelados';

const FILTERS: Array<{ id: Filter; label: string; match: (o: Order) => boolean }> = [
  { id: 'todos', label: 'Todos', match: () => true },
  { id: 'andamento', label: 'Em andamento', match: (o) => ['pendente', 'preparacao', 'enviado'].includes(o.status) },
  { id: 'concluidos', label: 'Entregues', match: (o) => o.status === 'entregue' },
  { id: 'cancelados', label: 'Cancelados', match: (o) => o.status === 'cancelado' },
];

export function CustomerOrdersList() {
  const orders = useCustomerOrders();
  const [filter, setFilter] = useState<Filter>('todos');
  const list = useMemo(() => orders.filter(FILTERS.find((f) => f.id === filter)!.match), [orders, filter]);

  if (orders.length === 0) {
    return <EmptyState icon={<Package className="size-6" />} title="Você ainda não tem pedidos" description="Quando você comprar, o andamento de cada pedido aparece aqui." action={<LinkButton href="/camisas">Ver camisas</LinkButton>} />;
  }

  return (
    <div>
      <h2 className="heading-display mb-5 text-4xl">Meus pedidos</h2>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Filtrar pedidos">
        {FILTERS.map((f) => (
          <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)} className="shrink-0">
            {f.label} <span className="opacity-60">{orders.filter(f.match).length}</span>
          </Chip>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-sm text-muted ring-1 ring-white/[0.06]">Nenhum pedido neste filtro.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((o, i) => (
            <li key={o.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}>
              <article className="rounded-2xl bg-surface p-4 ring-1 ring-white/[0.06] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-fg">#{o.number.replace('-', '')}</p>
                    <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      <div className="flex gap-1"><dt>Data:</dt><dd className="text-fg-2">{formatShortDate(o.createdAt)}</dd></div>
                      <div className="flex gap-1"><dt>Valor:</dt><dd className="font-semibold text-fg-2">{formatPrice(o.total)}</dd></div>
                      <div className="flex gap-1"><dt>Itens:</dt><dd className="text-fg-2">{orderItemsCount(o)}</dd></div>
                    </dl>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {o.lines.slice(0, 4).map((l) =>
                    l.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={l.productId + l.size} src={l.image} alt="" width={720} height={960} loading="lazy" decoding="async" className="h-14 w-11 rounded-md bg-surface-2 object-cover" />
                    ) : (
                      <span key={l.productId + l.size} className="h-14 w-11 rounded-md bg-surface-2" />
                    ),
                  )}
                  {o.lines.length > 4 && <span className="text-xs text-muted">+{o.lines.length - 4}</span>}
                </div>
                <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_auto]">
                  <OrderProgress order={o} />
                  <LinkButton href={`/conta/pedidos/${o.id}`} size="sm" variant="secondary">
                    Ver pedido <ArrowRight className="size-3.5" />
                  </LinkButton>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CustomerOrderDetail({ id }: { id: string }) {
  const customer = useCurrentCustomer();
  const { orders, hydrated } = useStoreData();
  const order = orders.find((o) => o.id === id && o.customerId === customer.id);

  if (!order) {
    if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-surface" aria-busy="true" />;
    return <EmptyState icon={<Package className="size-6" />} title="Pedido não encontrado" description="Ele não existe ou pertence a outra conta." action={<LinkButton href="/conta/pedidos">Meus pedidos</LinkButton>} />;
  }

  const payment = PAYMENT_STATUS_META[order.payment?.status ?? 'aguardando_integracao'];

  return (
    <div className="space-y-6">
      <Link href="/conta/pedidos" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Meus pedidos
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="heading-display text-4xl sm:text-5xl">Pedido {order.number}</h2>
          <p className="mt-1 text-sm text-muted">Realizado em {formatDateTime(order.createdAt)} · {orderItemsCount(order)} {orderItemsCount(order) === 1 ? 'item' : 'itens'}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.status === 'cancelado' && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">
          <XCircle className="mt-0.5 size-5 shrink-0 text-danger" /> Este pedido foi cancelado. Se tiver dúvidas, fale com a gente pelo e-mail {site.contactEmail}.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {order.status !== 'cancelado' && (
            <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
              <h3 className="mb-5 text-sm font-bold uppercase tracking-wider">Acompanhamento</h3>
              <OrderTimeline order={order} />
            </section>
          )}
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Produtos</h3>
            <OrderItems order={order} />
          </section>
        </div>
        <div className="space-y-6">
          <TrackingCard order={order} />
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Resumo</h3>
            <OrderTotals order={order} />
          </section>
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Entrega</h3>
            <OrderDelivery order={order} />
          </section>
          <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><CreditCard className="size-4 text-brand-400" /> Pagamento</h3>
            <Badge tone={payment.tone} dot className={cn('normal-case tracking-normal')}>{payment.label}</Badge>
            <p className="mt-2 text-sm text-fg-2">{payment.description}</p>
          </section>
          <p className="flex items-start gap-2 text-xs text-muted">
            <CircleHelp className="mt-0.5 size-3.5 shrink-0" /> Precisa de ajuda com este pedido? Escreva para {site.contactEmail} informando o número {order.number}.
          </p>
        </div>
      </div>
    </div>
  );
}

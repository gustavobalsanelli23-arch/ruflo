'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, XCircle } from 'lucide-react';
import type { Order } from '@/types/commerce';
import type { BadgeTone } from '@/components/ui/Badge';
import { useCustomerOrders } from '@/hooks/useAccountData';
import { useStoreData } from '@/context/StoreDataContext';
import { useCurrentCustomer } from '@/context/CustomerAuthContext';
import { cn, formatDateTime } from '@/lib/format';
import { orderItemsCount, PAYMENT_STATUS_META } from '@/lib/orders';
import { site } from '@/data/site';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Chip } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { OrderLocker, OrderStatusTag } from '@/components/orders/OrderLocker';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { TrackingCard } from '@/components/orders/TrackingCard';
import { OrderDelivery, OrderItems, OrderTotals } from '@/components/orders/OrderSummaryBlocks';
import { PaymentLinks } from '@/components/orders/PaymentLinks';
import { AccountHeading, ShelfTitle } from './AccountUI';

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

  return (
    <div>
      <AccountHeading title="Meus pedidos" description="O andamento, o rastreio e os detalhes de cada compra." />
      {orders.length === 0 ? (
        <EmptyState
          headingLevel="h2"
          icon={<Package className="size-6" strokeWidth={1.75} />}
          title="Você ainda não tem pedidos"
          description="Quando você comprar, o andamento de cada pedido aparece aqui."
          action={<LinkButton href="/camisas">Ver camisas</LinkButton>}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar pedidos">
            {FILTERS.map((f) => (
              <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label} <span className="font-normal tabular-nums">{orders.filter(f.match).length}</span>
              </Chip>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="border-y border-line py-6 text-sm text-muted">Nenhum pedido neste filtro.</p>
          ) : (
            <ul className="space-y-3 sm:space-y-4">
              {list.map((o) => (
                <li key={o.id}>
                  <OrderLocker order={o} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** Cor do rótulo do pagamento: só os estados que significam algo ganham cor. */
const PAYMENT_TONE: Partial<Record<BadgeTone, string>> = { success: 'text-success', warn: 'text-warn', danger: 'text-danger' };

/** Esqueleto do detalhe com as medidas da página (título, estações e recibo). */
function OrderDetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando pedido">
      <div className="shelf-line mb-8 pb-5 sm:mb-10 sm:pb-6">
        <Skeleton className="h-4 w-28 rounded-sm" />
        <Skeleton className="mt-5 h-10 w-64 rounded-sm sm:h-12 sm:w-80" />
        <Skeleton className="mt-4 h-4 w-52 rounded-sm" />
      </div>
      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:gap-14">
        <div className="space-y-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-8 shrink-0 rounded-[var(--radius-button)]" />
              <Skeleton className="h-4 w-40 rounded-sm" />
            </div>
          ))}
        </div>
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

export function CustomerOrderDetail({ id }: { id: string }) {
  const customer = useCurrentCustomer();
  const { orders, hydrated } = useStoreData();
  const order = orders.find((o) => o.id === id && o.customerId === customer.id);

  if (!order) {
    if (!hydrated) return <OrderDetailSkeleton />;
    return (
      <div>
        <AccountHeading title="Pedido não encontrado" description="Ele não existe ou pertence a outra conta." />
        <LinkButton href="/conta/pedidos" variant="secondary">
          Meus pedidos
        </LinkButton>
      </div>
    );
  }

  const payment = PAYMENT_STATUS_META[order.payment?.status ?? 'aguardando_integracao'];
  const items = orderItemsCount(order);

  return (
    <div>
      <AccountHeading
        back={
          <Link href="/conta/pedidos" className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-fg">
            <ArrowLeft className="motion-lift size-4 transition-[translate] duration-150 ease-[var(--ease-out-fz)] group-hover:-translate-x-0.5" strokeWidth={1.75} aria-hidden />
            Meus pedidos
          </Link>
        }
        title={`Pedido ${order.number}`}
        description={`Realizado em ${formatDateTime(order.createdAt)}, ${items} ${items === 1 ? 'item' : 'itens'}.`}
        aside={<OrderStatusTag status={order.status} size="md" />}
      />

      {order.status === 'cancelado' && (
        <div className="mb-10 flex max-w-3xl items-start gap-3 rounded-[var(--radius-card)] border border-danger/40 bg-danger/[0.06] px-4 py-3.5 text-sm text-fg-2">
          <XCircle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.75} aria-hidden />
          <p>Este pedido foi cancelado. Se tiver dúvidas, fale com a gente pelo e-mail {site.contactEmail}.</p>
        </div>
      )}

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] xl:items-start xl:gap-14">
        <div className="min-w-0 space-y-12">
          {order.status !== 'cancelado' && (
            <section>
              <ShelfTitle title="Acompanhamento" />
              <OrderTimeline order={order} />
            </section>
          )}
          <TrackingCard order={order} />
          <section>
            <ShelfTitle title="Produtos" />
            <OrderItems order={order} />
          </section>
        </div>

        {/* Recibo: um armário só, dividido em resumo, entrega e pagamento */}
        <div className="min-w-0 xl:sticky xl:top-20">
          <div className="locker divide-y divide-line rounded-[var(--radius-card)]">
            <section className="p-5">
              <h2 className="heading-display mb-4 text-xl text-fg">Resumo</h2>
              <OrderTotals order={order} />
            </section>
            <section className="p-5">
              <h2 className="heading-display mb-4 text-xl text-fg">Entrega</h2>
              <OrderDelivery order={order} />
            </section>
            <section className="p-5">
              <h2 className="heading-display mb-3 text-xl text-fg">Pagamento</h2>
              <p className={cn('text-sm font-semibold', PAYMENT_TONE[payment.tone] ?? 'text-fg')}>{payment.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-2">{payment.description}</p>
              <PaymentLinks order={order} className="mt-4" />
            </section>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Precisa de ajuda com este pedido? Escreva para {site.contactEmail} informando o número {order.number}.
          </p>
        </div>
      </div>
    </div>
  );
}

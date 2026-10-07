'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Mail, MapPin, Phone, ReceiptText } from 'lucide-react';
import type { OrderStatus } from '@/types/commerce';
import { ORDER_STATUSES } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { cn, formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orders';
import { DemoNotice, EmptyState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { OrderStatusBadge } from '@/components/orders/OrderCard';
import { ProductImage } from '@/components/products/ProductImage';
import { useAdmin } from './AdminGuard';
import { AdminCard, AdminLinkButton, AdminPageHeader } from './AdminUI';

const FLOW: OrderStatus[] = ['pendente', 'preparacao', 'enviado', 'entregue'];

export function OrderDetailAdmin({ id }: { id: string }) {
  const { orders, products, customers, setOrderStatus, hydrated } = useStoreData();
  const { log } = useAdmin();
  const { notify } = useToast();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-surface" aria-busy="true" />;
    return <EmptyState title="Pedido não encontrado" description="Ele pode ter sido removido dos dados de exemplo." action={<AdminLinkButton href="/admin/pedidos">Voltar aos pedidos</AdminLinkButton>} />;
  }

  const customer = customers.find((c) => c.id === order.customerId);
  const address = customer?.addresses.find((a) => a.isDefault) ?? customer?.addresses[0];
  const items = order.lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = order.lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0);
  const step = FLOW.indexOf(order.status);

  const change = (status: OrderStatus) => {
    setOrderStatus(order.id, status);
    log('pedido', `alterou o pedido ${order.number} para "${ORDER_STATUS_META[status].label}"`);
    notify(`${order.number}: status alterado para "${ORDER_STATUS_META[status].label}".`);
  };

  return (
    <>
      <Link href="/admin/pedidos" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Pedidos
      </Link>
      <AdminPageHeader
        title={`Pedido ${order.number}`}
        description={`Criado em ${formatDateTime(order.createdAt)} · ${items} ${items === 1 ? 'item' : 'itens'}`}
        actions={
          <label className="flex items-center gap-3 text-xs text-muted">
            Status
            <Select value={order.status} onChange={(e) => change(e.target.value as OrderStatus)} className="h-10 w-44 rounded-lg text-sm" aria-label="Alterar status do pedido">
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_META[s].label}
                </option>
              ))}
            </Select>
          </label>
        }
      />

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4 sm:space-y-6">
          <AdminCard title="Andamento">
            <div className="p-5">
              {order.status === 'cancelado' ? (
                <p className="flex items-center gap-2 text-sm text-danger"><OrderStatusBadge status="cancelado" /> Este pedido foi cancelado.</p>
              ) : (
                <ol className="grid grid-cols-4 gap-2">
                  {FLOW.map((s, i) => {
                    const done = i <= step;
                    return (
                      <li key={s} className="flex flex-col gap-2">
                        <span className={cn('h-1.5 rounded-full', done ? 'bg-brand-500' : 'bg-white/[0.08]')} />
                        <span className={cn('flex items-center gap-1 text-xs', done ? 'font-semibold text-fg' : 'text-muted')}>
                          {i < step && <Check className="size-3 text-brand-400" />}
                          {ORDER_STATUS_META[s].label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </AdminCard>

          <AdminCard title="Produtos">
            <ul className="divide-y divide-white/[0.05]">
              {order.lines.map((l) => {
                const product = products.find((p) => p.id === l.productId);
                return (
                  <li key={l.productId + l.size} className="flex items-center gap-4 px-5 py-3.5">
                    {product ? <ProductImage product={product} className="h-16 w-12 shrink-0 rounded-lg" /> : <span className="h-16 w-12 shrink-0 rounded-lg bg-surface-2" />}
                    <div className="min-w-0 flex-1">
                      {product ? (
                        <Link href={`/admin/produtos/${product.id}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-300">{l.name}</Link>
                      ) : (
                        <p className="line-clamp-2 text-sm font-semibold">{l.name}</p>
                      )}
                      <p className="text-xs text-muted">Tamanho {l.size} · {l.quantity} × {formatPrice(l.unitPrice)}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{formatPrice(l.quantity * l.unitPrice)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-1.5 border-t border-white/[0.06] px-5 py-4 text-sm">
              <div className="flex justify-between text-fg-2"><dt>Subtotal</dt><dd className="tabular-nums">{formatPrice(subtotal)}</dd></div>
              <div className="flex justify-between text-fg-2"><dt>Frete</dt><dd className="text-muted">Não calculado (demonstração)</dd></div>
              <div className="flex justify-between pt-1 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(order.total)}</dd></div>
            </dl>
          </AdminCard>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <AdminCard title="Cliente">
            <div className="space-y-3 p-5 text-sm">
              <p className="font-semibold text-fg">{order.customerName}</p>
              {customer && (
                <>
                  <p className="flex items-center gap-2 text-fg-2"><Mail className="size-4 text-muted" /> {customer.email}</p>
                  <p className="flex items-center gap-2 text-fg-2"><Phone className="size-4 text-muted" /> {customer.phone}</p>
                </>
              )}
              {address && (
                <p className="flex items-start gap-2 text-fg-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                  <span>
                    {address.street}, {address.number}
                    {address.complement && ` — ${address.complement}`}
                    <br />
                    {address.district} · {address.city}/{address.state} · {address.zip}
                  </span>
                </p>
              )}
            </div>
          </AdminCard>
          <AdminCard title="Pagamento">
            <div className="flex items-start gap-3 p-5 text-sm text-fg-2">
              <ReceiptText className="mt-0.5 size-4 shrink-0 text-muted" />
              Pagamentos ainda não estão integrados. Quando o gateway for conectado, o status e o comprovante aparecerão aqui.
            </div>
          </AdminCard>
          <DemoNotice>Alterar o status aqui não notifica o cliente — é apenas uma simulação do fluxo de gestão.</DemoNotice>
        </div>
      </div>
    </>
  );
}

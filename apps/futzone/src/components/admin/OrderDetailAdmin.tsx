'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Mail, PackageOpen, Phone, Truck, UserRound } from 'lucide-react';
import type { OrderEventType, OrderStatus } from '@/types/commerce';
import { ORDER_STATUSES } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { cn, formatDateTime, formatPrice } from '@/lib/format';
import { formatAddress, ORDER_STATUS_META, PAYMENT_STATUS_META } from '@/lib/orders';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { formatCEP } from '@/lib/validation';
import { DemoNotice, EmptyState } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Form';
import { ProductImage } from '@/components/products/ProductImage';
import { useAdmin } from './AdminGuard';
import { AdminBadge, AdminButton, AdminCard, AdminLinkButton, AdminPageHeader } from './AdminUI';

const FLOW: OrderStatus[] = ['pendente', 'preparacao', 'enviado', 'entregue'];

const EVENT_LABEL: Record<OrderEventType, string> = {
  criado: 'Pedido realizado',
  pagamento_aprovado: 'Pagamento aprovado',
  preparacao: 'Processando (em preparação)',
  enviado: 'Enviado',
  em_transito: 'Em trânsito',
  entregue: 'Concluído (entregue)',
  cancelado: 'Cancelado',
  rastreio: 'Código de rastreio registrado',
};

const BY_LABEL = { cliente: 'cliente', admin: 'administrador', sistema: 'sistema' } as const;

export function OrderDetailAdmin({ id }: { id: string }) {
  const { orders, products, customers, setOrderStatus, setOrderTracking, hydrated } = useStoreData();
  const { log } = useAdmin();
  const { notify } = useToast();
  const order = orders.find((o) => o.id === id);
  const [code, setCode] = useState('');
  const [carrier, setCarrier] = useState('');

  if (!order) {
    if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-surface" aria-busy="true" />;
    return <EmptyState title="Pedido não encontrado" description="Ele pode ter sido removido dos dados de exemplo." action={<AdminLinkButton href="/admin/pedidos">Voltar aos pedidos</AdminLinkButton>} />;
  }

  const customer = customers.find((c) => c.id === order.customerId);
  const address = order.address ?? customer?.addresses.find((a) => a.isDefault) ?? customer?.addresses[0];
  const items = order.lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = order.subtotal ?? order.lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0);
  const step = FLOW.indexOf(order.status);
  const s = order.shipping;
  const payment = PAYMENT_STATUS_META[order.payment?.status ?? 'aguardando_integracao'];

  const change = (status: OrderStatus) => {
    setOrderStatus(order.id, status);
    log('pedido', `alterou o pedido ${order.number} para "${ORDER_STATUS_META[status].label}"`);
    notify(`${order.number}: status alterado para "${ORDER_STATUS_META[status].label}".`);
  };

  const saveTracking = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      notify('Informe um código de rastreio válido.', 'warning');
      return;
    }
    const by = carrier.trim() || s?.carrier || 'Transportadora';
    setOrderTracking(order.id, { code: trimmed, carrier: by });
    log('pedido', `registrou o rastreio ${trimmed} no pedido ${order.number}`);
    notify('Código de rastreio salvo. O cliente já vê na conta dele.');
    setCode('');
  };

  return (
    <>
      <Link href="/admin/pedidos" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Pedidos
      </Link>
      <AdminPageHeader
        title={`Pedido ${order.number}`}
        description={`Criado em ${formatDateTime(order.createdAt)} · ${items} ${items === 1 ? 'item' : 'itens'}${order.guest ? ' · compra como visitante' : ''}`}
        actions={
          <label className="flex items-center gap-3 text-xs text-muted">
            Status
            <Select value={order.status} onChange={(e) => change(e.target.value as OrderStatus)} className="h-10 w-44 rounded-lg text-sm" aria-label="Alterar status do pedido">
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {ORDER_STATUS_META[st].label}
                </option>
              ))}
            </Select>
          </label>
        }
      />

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4 sm:space-y-6">
          <AdminCard title="Andamento">
            <div className="p-5">
              {order.status === 'cancelado' ? (
                <AdminBadge tone="danger">Pedido cancelado</AdminBadge>
              ) : (
                <ol className="grid grid-cols-4 gap-2">
                  {FLOW.map((st, i) => (
                    <li key={st} className="flex flex-col gap-2">
                      <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand-500' : 'bg-white/[0.08]')} />
                      <span className={cn('flex items-center gap-1 text-xs', i <= step ? 'font-semibold text-fg' : 'text-muted')}>
                        {i < step && <Check className="size-3 text-brand-400" />}
                        {ORDER_STATUS_META[st].label}
                      </span>
                    </li>
                  ))}
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
              <div className="flex justify-between text-fg-2">
                <dt>Frete{s ? ` (${s.serviceName})` : ''}</dt>
                <dd className="tabular-nums">{s ? (s.price === 0 ? 'Grátis' : formatPrice(s.price)) : '—'}</dd>
              </div>
              {!!order.discount && (
                <div className="flex justify-between text-success"><dt>Desconto{order.coupon ? ` (${order.coupon.code})` : ''}</dt><dd className="tabular-nums">− {formatPrice(order.discount)}</dd></div>
              )}
              <div className="flex justify-between pt-1 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(order.total)}</dd></div>
            </dl>
          </AdminCard>

          <AdminCard title="Histórico" description="Eventos do pedido (base das notificações do cliente)">
            <ol className="divide-y divide-white/[0.05]">
              {[...(order.history ?? [])].reverse().map((e, i) => (
                <li key={e.at + e.type + i} className="flex items-start gap-3 px-5 py-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-400" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-fg">{EVENT_LABEL[e.type]}</span>
                    {e.note && <span className="block text-xs text-fg-2">{e.note}</span>}
                    <span className="text-xs text-muted">{formatDateTime(e.at)}{e.by ? ` · por ${BY_LABEL[e.by]}` : ''}</span>
                  </span>
                </li>
              ))}
              {!order.history?.length && <li className="px-5 py-4 text-sm text-muted">Sem eventos registrados.</li>}
            </ol>
          </AdminCard>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <AdminCard title="Cliente" action={customer && <Link href={`/admin/clientes/${customer.id}`} className="text-xs font-semibold text-brand-400 hover:text-brand-300">Ver cliente</Link>}>
            <div className="space-y-2.5 p-5 text-sm">
              <p className="flex items-center gap-2 font-semibold text-fg">
                <UserRound className="size-4 text-muted" /> {order.customerName}
                {order.guest && <AdminBadge tone="neutral" dot={false}>Visitante</AdminBadge>}
              </p>
              {(order.customerEmail ?? customer?.email) && <p className="flex items-center gap-2 text-fg-2"><Mail className="size-4 text-muted" /> {order.customerEmail ?? customer?.email}</p>}
              {customer && <p className="flex items-center gap-2 text-fg-2"><Phone className="size-4 text-muted" /> {customer.phone}</p>}
            </div>
          </AdminCard>

          <AdminCard title="Entrega">
            <div className="space-y-4 p-5 text-sm">
              {address ? (
                <div>
                  <p className="text-xs text-muted">Endereço de entrega</p>
                  <p className="mt-1 font-semibold text-fg">{address.recipient}</p>
                  <p className="text-fg-2">{formatAddress(address)}</p>
                  {address.reference && <p className="text-xs text-muted">Referência: {address.reference}</p>}
                </div>
              ) : (
                <p className="text-muted">Endereço não informado.</p>
              )}
              {s ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted">Método de envio</p>
                  <p className="font-semibold text-fg">
                    {s.serviceName} · {s.carrier} {s.isMock && <AdminBadge tone="warn" dot={false} className="ml-1">Simulado</AdminBadge>}
                  </p>
                  <p className="text-fg-2">
                    {s.price === 0 ? `Grátis (de ${formatPrice(s.originalPrice)})` : formatPrice(s.price)} · {formatBusinessDays(s.minDays, s.maxDays)}
                  </p>
                  <p className="text-fg-2">Previsão {formatDeliveryWindow(s.estimatedFrom, s.estimatedTo)}</p>
                  {s.package && (
                    <p className="pt-1 text-xs text-muted">
                      Cálculo: {s.package.items} {s.package.items === 1 ? 'item' : 'itens'} · {(s.package.weightGrams / 1000).toLocaleString('pt-BR')} kg · {s.package.lengthCm}×{s.package.widthCm}×{s.package.heightCm} cm · CEP origem {s.originZip ? formatCEP(s.originZip) : 'não configurado'} → {formatCEP(s.destinationZip)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted">Pedido sem cotação de frete registrada.</p>
              )}
            </div>
          </AdminCard>

          <AdminCard title="Rastreio">
            <div className="space-y-4 p-5 text-sm">
              {order.tracking ? (
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 size-4 text-brand-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold text-fg">{order.tracking.code}</p>
                    <p className="text-xs text-muted">{order.tracking.carrier} · registrado em {formatDateTime(order.tracking.addedAt)}</p>
                  </div>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setOrderTracking(order.id, null);
                      log('pedido', `removeu o rastreio do pedido ${order.number}`);
                    }}
                  >
                    Remover
                  </AdminButton>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-muted"><PackageOpen className="size-4" /> Nenhum código de rastreio ainda.</p>
              )}
              <form onSubmit={saveTracking} className="space-y-2">
                <label className="text-xs font-semibold text-fg-2" htmlFor="tracking-code">{order.tracking ? 'Substituir código' : 'Adicionar código de rastreio'}</label>
                <Input id="tracking-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex.: AA123456789BR" className="h-10 rounded-lg font-mono uppercase" />
                <Input aria-label="Transportadora" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder={s?.carrier ?? 'Transportadora'} className="h-10 rounded-lg" />
                <AdminButton type="submit" size="sm">Salvar rastreio</AdminButton>
              </form>
              <p className="text-xs text-muted">Sem API de rastreamento: o cliente vê o código e as atualizações registradas pela loja.</p>
            </div>
          </AdminCard>

          <AdminCard title="Pagamento">
            <div className="space-y-2 p-5 text-sm">
              <AdminBadge tone={payment.tone}>{payment.label}</AdminBadge>
              <p className="text-fg-2">{payment.description}</p>
              <p className="text-xs text-muted">Gateway de pagamento: não integrado.</p>
            </div>
          </AdminCard>
          <DemoNotice>Alterar status ou rastreio atualiza a conta do cliente neste navegador. Nenhum e-mail é enviado nesta etapa.</DemoNotice>
        </div>
      </div>
    </>
  );
}

import type { Cents } from '@/types/catalog';
import type { Address, Order, OrderEvent, OrderEventType, OrderLine, OrderShipping, OrderStatus, PaymentStatus } from '@/types/commerce';
import type { BadgeTone } from '@/components/ui/Badge';
import { toLocalISO } from './format';

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: BadgeTone; color: string }> = {
  pendente: { label: 'Pendente', tone: 'warn', color: 'var(--color-warn)' },
  preparacao: { label: 'Processando', tone: 'brand', color: 'var(--color-brand-400)' },
  enviado: { label: 'Enviado', tone: 'violet', color: 'var(--color-violet)' },
  entregue: { label: 'Concluído', tone: 'success', color: 'var(--color-success)' },
  cancelado: { label: 'Cancelado', tone: 'danger', color: 'var(--color-danger)' },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: BadgeTone; description: string }> = {
  aguardando_integracao: {
    label: 'Aguardando integração',
    tone: 'neutral',
    description: 'O pagamento será solicitado quando o gateway de pagamento for integrado. Nenhuma cobrança foi feita.',
  },
  pendente: { label: 'Aguardando pagamento', tone: 'warn', description: 'Pagamento ainda não confirmado.' },
  aprovado: { label: 'Aprovado', tone: 'success', description: 'Pagamento confirmado.' },
  recusado: { label: 'Recusado', tone: 'danger', description: 'O pagamento foi recusado.' },
  estornado: { label: 'Estornado', tone: 'neutral', description: 'O valor foi devolvido.' },
};

/** Evento do histórico correspondente a cada status. */
export const EVENT_FOR_STATUS: Record<OrderStatus, OrderEventType> = {
  pendente: 'criado',
  preparacao: 'preparacao',
  enviado: 'enviado',
  entregue: 'entregue',
  cancelado: 'cancelado',
};

const FLOW: OrderStatus[] = ['pendente', 'preparacao', 'enviado', 'entregue'];

export type TimelineState = 'done' | 'current' | 'upcoming' | 'waiting';

export interface TimelineStep {
  id: 'realizado' | 'pagamento' | 'preparando' | 'enviado' | 'transito' | 'entregue';
  label: string;
  state: TimelineState;
  at?: string;
  detail?: string;
}

const lastEvent = (order: Order, type: OrderEventType) => [...(order.history ?? [])].reverse().find((e) => e.type === type)?.at;

/**
 * Linha do tempo do pedido para o cliente:
 * Pedido realizado → Pagamento aprovado → Preparando → Enviado → Em trânsito → Entregue.
 * A etapa de pagamento fica "aguardando integração" enquanto não houver gateway.
 */
export function buildOrderTimeline(order: Order): TimelineStep[] {
  const idx = FLOW.indexOf(order.status);
  const payment = order.payment?.status;
  const paymentApproved = payment === 'aprovado' || idx >= 1;
  const paymentDetail =
    payment === 'aprovado'
      ? 'Pagamento confirmado'
      : idx >= 1
        ? 'Confirmação simulada: gateway de pagamento ainda não integrado'
        : payment === 'aguardando_integracao'
          ? 'Etapa preparada para o gateway de pagamento (nenhuma cobrança feita)'
          : 'Aguardando confirmação do pagamento';

  const steps: TimelineStep[] = [
    { id: 'realizado', label: 'Pedido realizado', state: 'done', at: order.createdAt },
    {
      id: 'pagamento',
      label: 'Pagamento aprovado',
      state: paymentApproved ? 'done' : payment === 'aguardando_integracao' ? 'waiting' : 'current',
      at: lastEvent(order, 'pagamento_aprovado'),
      detail: paymentDetail,
    },
    { id: 'preparando', label: 'Preparando pedido', state: idx >= 2 ? 'done' : idx === 1 ? 'current' : 'upcoming', at: lastEvent(order, 'preparacao') },
    { id: 'enviado', label: 'Enviado', state: idx >= 2 ? 'done' : 'upcoming', at: lastEvent(order, 'enviado') },
    {
      id: 'transito',
      label: 'Em trânsito',
      state: idx >= 3 ? 'done' : idx === 2 ? 'current' : 'upcoming',
      at: lastEvent(order, 'em_transito'),
      detail: idx === 2 ? (order.tracking ? `Rastreio ${order.tracking.code}` : 'Aguardando código de rastreio') : undefined,
    },
    { id: 'entregue', label: 'Entregue', state: idx >= 3 ? 'done' : 'upcoming', at: lastEvent(order, 'entregue') },
  ];
  return steps;
}

/** Próximo número sequencial (FZ-10429…). */
export function nextOrderNumber(orders: Order[]): string {
  const max = orders.reduce((m, o) => Math.max(m, Number(o.number.replace(/\D/g, '')) || 0), 10000);
  return `FZ-${String(max + 1).padStart(5, '0')}`;
}

export interface OrderTotals {
  /** Soma pelo preço "de" (antes de promoções). */
  products: Cents;
  promoSavings: Cents;
  /** Soma pelo preço de venda. */
  subtotal: Cents;
  shipping: Cents | null;
  discount: Cents;
  total: Cents;
}

/** Totais do checkout: produtos, subtotal, frete, desconto (cupom) e total. */
export function computeTotals(
  lines: Array<{ unitPrice: Cents; compareAtPrice?: Cents; quantity: number }>,
  shipping: Cents | null,
  discount: Cents = 0,
): OrderTotals {
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const products = lines.reduce((n, l) => n + Math.max(l.unitPrice, l.compareAtPrice ?? 0) * l.quantity, 0);
  const safeDiscount = Math.max(0, Math.min(discount, subtotal + (shipping ?? 0)));
  return { products, promoSavings: products - subtotal, subtotal, shipping, discount: safeDiscount, total: Math.max(0, subtotal + (shipping ?? 0) - safeDiscount) };
}

export interface NewOrderInput {
  customerId: string;
  customerName: string;
  customerEmail: string;
  guest: boolean;
  lines: OrderLine[];
  address: Address;
  shipping: OrderShipping;
  coupon?: { code: string; description: string; amount: Cents };
  totals: OrderTotals;
}

/** Monta o pedido a partir do checkout (pagamento: aguardando integração). */
export function buildOrder(input: NewOrderInput, existing: Order[], now: Date = new Date()): Order {
  const at = toLocalISO(now);
  const created: OrderEvent = { type: 'criado', at, by: 'cliente' };
  return {
    id: `o-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    number: nextOrderNumber(existing),
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    guest: input.guest || undefined,
    lines: input.lines,
    subtotal: input.totals.subtotal,
    discount: input.totals.discount,
    shippingCost: input.totals.shipping ?? 0,
    coupon: input.coupon,
    total: input.totals.total,
    status: 'pendente',
    createdAt: at,
    address: input.address,
    shipping: input.shipping,
    payment: { status: 'aguardando_integracao', updatedAt: at },
    history: [created],
  };
}

export const orderItemsCount = (order: Order) => order.lines.reduce((n, l) => n + l.quantity, 0);

/** "Rua X, 10, Apto 1, Bairro, Cidade/UF, CEP 00000-000" */
export function formatAddress(a: Address): string {
  return `${a.street}, ${a.number}${a.complement ? `, ${a.complement}` : ''}, ${a.district}, ${a.city}/${a.state}, CEP ${a.zip}`;
}

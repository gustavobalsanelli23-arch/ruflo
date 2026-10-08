import type { Order, OrderEventType } from '@/types/commerce';
import { readJSON, STORAGE_KEYS, writeJSON } from '@/services/storage';

/**
 * Notificações do cliente.
 *
 * Hoje são geradas a partir do histórico dos pedidos e exibidas dentro da
 * conta. Para e-mail/push, implemente `NotificationChannel` (no servidor) e
 * dispare `send` quando o status do pedido mudar.
 */

export interface CustomerNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  kind: OrderEventType;
  title: string;
  message: string;
  at: string;
  read: boolean;
}

export interface NotificationChannel {
  readonly id: 'conta' | 'email' | 'push' | 'whatsapp';
  send(notification: CustomerNotification, to: { email?: string; phone?: string }): Promise<void>;
}

const TEMPLATES: Partial<Record<OrderEventType, { title: string; message: (n: string) => string }>> = {
  criado: { title: 'Pedido confirmado.', message: (n) => `Recebemos o pedido ${n}.` },
  pagamento_aprovado: { title: 'Pagamento aprovado.', message: (n) => `O pagamento do pedido ${n} foi confirmado.` },
  preparacao: { title: 'Seu pedido está sendo preparado.', message: (n) => `Estamos separando os produtos do pedido ${n}.` },
  enviado: { title: 'Seu pedido foi enviado.', message: (n) => `O pedido ${n} saiu da loja.` },
  rastreio: { title: 'Código de rastreio disponível.', message: (n) => `Acompanhe a entrega do pedido ${n}.` },
  em_transito: { title: 'Seu pedido está a caminho.', message: (n) => `O pedido ${n} está em trânsito.` },
  entregue: { title: 'Seu pedido foi entregue.', message: (n) => `O pedido ${n} foi entregue. Aproveite!` },
  cancelado: { title: 'Pedido cancelado.', message: (n) => `O pedido ${n} foi cancelado.` },
};

/** Deriva as notificações dos eventos dos pedidos do cliente (mais recentes primeiro). */
export function deriveNotifications(orders: Order[], readIds: Set<string>): CustomerNotification[] {
  const list: CustomerNotification[] = [];
  for (const order of orders) {
    for (const event of order.history ?? []) {
      const tpl = TEMPLATES[event.type];
      if (!tpl) continue;
      const id = `${order.id}:${event.type}:${event.at}`;
      list.push({ id, orderId: order.id, orderNumber: order.number, kind: event.type, title: tpl.title, message: tpl.message(order.number), at: event.at, read: readIds.has(id) });
    }
  }
  return list.sort((a, b) => b.at.localeCompare(a.at));
}

type ReadMap = Record<string, string[]>;

export const notificationReadStore = {
  get(customerId: string): Set<string> {
    return new Set(readJSON<ReadMap>(STORAGE_KEYS.notificationsRead, {})[customerId] ?? []);
  },
  markRead(customerId: string, ids: string[]): void {
    const map = readJSON<ReadMap>(STORAGE_KEYS.notificationsRead, {});
    map[customerId] = Array.from(new Set([...(map[customerId] ?? []), ...ids])).slice(-500);
    writeJSON(STORAGE_KEYS.notificationsRead, map);
  },
};

import type { Order, OrderLine, OrderStatus } from '@/types/commerce';
import type { Size } from '@/types/catalog';
import { seedProducts } from './products';
import { seedCustomers } from './customers';

/** Pedidos simulados para a área do cliente e o painel administrativo. */

type LineSeed = [productId: string, size: Size, quantity: number];

function line([productId, size, quantity]: LineSeed): OrderLine {
  const product = seedProducts.find((p) => p.id === productId);
  if (!product) throw new Error(`Produto desconhecido no pedido: ${productId}`);
  return { productId, name: product.name, size, quantity, unitPrice: product.price };
}

function order(n: number, customerId: string, status: OrderStatus, createdAt: string, lines: LineSeed[]): Order {
  const customer = seedCustomers.find((c) => c.id === customerId);
  if (!customer) throw new Error(`Cliente desconhecido no pedido: ${customerId}`);
  const orderLines = lines.map(line);
  return {
    id: `o-${n}`,
    number: `FZ-${String(n).padStart(5, '0')}`,
    customerId,
    customerName: customer.name,
    lines: orderLines,
    total: orderLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    status,
    createdAt,
  };
}

export const seedOrders: Order[] = [
  order(10428, 'c-002', 'pendente', '2026-10-06T10:42:00', [['p-013', 'M', 1], ['p-026', 'P', 1]]),
  order(10427, 'c-005', 'pendente', '2026-10-06T09:15:00', [['p-001', 'G', 2]]),
  order(10426, 'c-001', 'preparacao', '2026-10-05T18:03:00', [['p-019', 'M', 1]]),
  order(10425, 'c-007', 'preparacao', '2026-10-05T14:20:00', [['p-007', 'G', 1], ['p-008', 'G', 1]]),
  order(10424, 'c-003', 'enviado', '2026-10-04T16:47:00', [['p-002', 'GG', 1]]),
  order(10423, 'c-008', 'enviado', '2026-10-04T11:09:00', [['p-024', '8', 1], ['p-023', '10', 1]]),
  order(10422, 'c-004', 'entregue', '2026-10-03T20:31:00', [['p-028', 'M', 1]]),
  order(10421, 'c-006', 'cancelado', '2026-10-03T13:55:00', [['p-011', 'P', 1]]),
  order(10420, 'c-001', 'entregue', '2026-10-02T09:40:00', [['p-001', 'M', 1], ['p-018', 'M', 1]]),
  order(10419, 'c-002', 'entregue', '2026-10-01T17:22:00', [['p-015', 'G', 1]]),
  order(10418, 'c-005', 'entregue', '2026-09-30T12:12:00', [['p-003', 'M', 1], ['p-027', 'P', 1]]),
  order(10417, 'c-007', 'entregue', '2026-09-30T08:44:00', [['p-013', 'G', 3]]),
  order(10416, 'c-001', 'cancelado', '2026-09-12T19:05:00', [['p-010', 'G', 1]]),
];

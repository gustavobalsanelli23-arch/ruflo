import 'server-only';
import type { PoolClient } from 'pg';
import type { Order, OrderEvent, OrderLine, OrderStatus } from '@/types/commerce';
import { ORDER_STATUSES } from '@/types/commerce';
import type { StockIssue } from '@/services/inventory.service';
import { buildOrder, computeTotals, EVENT_FOR_STATUS } from '@/lib/orders';
import { linkPriceMismatch, paymentGroups, productPriceKey } from '@/lib/paymentLinks';
import { isValidEmail, normalizeEmail, onlyDigits } from '@/lib/validation';
import { getPool, withTransaction } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';
import { loadProducts, toStoreProduct } from '@/server/catalog/store';
import { commitStockTx, normalizeLines, releaseStockTx, StockShortage, CommitInputError } from '@/server/catalog/stock';

/**
 * Pedidos gravados no banco. O cliente paga cada tipo de camisa no link da
 * Stripe correspondente; o pedido guarda time, tamanho e quantidade, e a
 * referência de cada pagamento (`FZ-10001-torcedor`) casa a Stripe com o painel.
 *
 * O preço vem sempre do banco (nunca do navegador) e precisa ser igual ao preço
 * fixo do link: se o painel mudou o preço de um produto, o pedido é recusado em
 * vez de cobrar um valor diferente do que o cliente viu.
 */

export class OrderInputError extends Error {}
export class OrderStateError extends Error {}

export type CreateOrderResult =
  | { ok: true; order: Order; repeated: boolean }
  | { ok: false; reason: 'estoque'; issues: StockIssue[] }
  | { ok: false; reason: 'preco'; products: string[] };

interface CustomerInput {
  id: string;
  name: string;
  email: string;
  phone?: string;
  guest: boolean;
}

/** Data e hora de São Paulo, no mesmo formato do site (AAAA-MM-DDTHH:mm:ss, sem fuso). */
export function saoPauloISO(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

function parseCustomer(raw: unknown): CustomerInput {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = typeof r.name === 'string' ? r.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof r.email === 'string' ? normalizeEmail(r.email) : '';
  const phone = typeof r.phone === 'string' ? onlyDigits(r.phone) : '';
  if (name.length < 2 || name.length > 120) throw new OrderInputError('Informe seu nome.');
  if (!isValidEmail(email) || email.length > 200) throw new OrderInputError('E-mail inválido.');
  if (phone && (phone.length < 10 || phone.length > 13)) throw new OrderInputError('Telefone inválido.');
  const accountId = typeof r.accountId === 'string' && /^[A-Za-z0-9_-]{3,80}$/.test(r.accountId) ? r.accountId : null;
  return { id: accountId ?? `visitante:${email}`, name, email, phone: phone || undefined, guest: !accountId };
}

const readOrder = async (db: PoolClient, id: string) => (await db.query<{ data: Order }>('SELECT data FROM orders WHERE id = $1', [id])).rows[0]?.data ?? null;

/** Pedido repetido só volta para quem o fez (mesmo e-mail): o id sozinho não dá acesso aos dados. */
function sameBuyer(order: Order, customer: CustomerInput): Order {
  if (order.customerEmail !== customer.email) throw new OrderInputError('Pedido inválido.');
  return order;
}

export async function createOrder(input: { orderId: unknown; customer: unknown; items: unknown }): Promise<CreateOrderResult> {
  const { orderId, lines } = normalizeLines(input.orderId, input.items);
  const customer = parseCustomer(input.customer);
  await ensureDatabase();
  try {
    return await withTransaction(async (db) => {
      // Mesmo pedido enviado de novo (duplo clique, rede instável): devolve o já gravado.
      const existing = await readOrder(db, orderId);
      if (existing) return { ok: true, order: sameBuyer(existing, customer), repeated: true } as const;

      const stored = new Map((await loadProducts(db, { ids: lines.map((l) => l.productId) })).map((sp) => [sp.row.id, toStoreProduct(sp)]));
      const missing: StockIssue[] = [];
      const wrongPrice: string[] = [];
      for (const l of lines) {
        const p = stored.get(l.productId);
        if (!p || p.status !== 'published') missing.push({ productId: l.productId, size: l.size, name: p?.name ?? 'Produto', requested: l.quantity, available: 0, kind: 'indisponivel' });
        else if (linkPriceMismatch(p)) wrongPrice.push(p.name);
      }
      if (missing.length) return { ok: false, reason: 'estoque', issues: missing } as const;
      if (wrongPrice.length) return { ok: false, reason: 'preco', products: [...new Set(wrongPrice)] } as const;

      const committed = await commitStockTx(db, orderId, lines);
      if (committed.repeated) {
        const again = await readOrder(db, orderId);
        if (again) return { ok: true, order: sameBuyer(again, customer), repeated: true } as const;
        throw new OrderInputError('Este pedido já foi registrado.');
      }

      const orderLines: OrderLine[] = lines.map((l) => {
        const p = stored.get(l.productId)!;
        return { productId: p.id, name: p.name, size: l.size, quantity: l.quantity, unitPrice: p.price, image: p.images[0]?.src, priceKey: productPriceKey(p) };
      });
      const seq = await db.query<{ n: string }>(`SELECT nextval('order_number_seq')::text AS n`);
      const number = `FZ-${seq.rows[0].n}`;
      const now = new Date();
      const order = buildOrder(
        {
          id: orderId,
          number,
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          guest: customer.guest,
          lines: orderLines,
          totals: computeTotals(orderLines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, compareAtPrice: stored.get(l.productId)?.compareAtPrice })), null, 0),
          payment: { status: 'pendente', gateway: 'stripe', method: 'link', links: paymentGroups(orderLines.map((l) => ({ priceKey: l.priceKey!, quantity: l.quantity, unitPrice: l.unitPrice })), number) },
        },
        [],
        now,
        saoPauloISO(now),
      );
      await db.query(`INSERT INTO orders (id, number, data, status, payment_status) VALUES ($1, $2, $3, $4, $5)`, [order.id, order.number, JSON.stringify(order), order.status, order.payment!.status]);
      return { ok: true, order, repeated: false } as const;
    });
  } catch (err) {
    if (err instanceof StockShortage) return { ok: false, reason: 'estoque', issues: err.issues };
    throw err;
  }
}

export async function listOrders(limit = 500): Promise<Order[]> {
  await ensureDatabase();
  const r = await getPool().query<{ data: Order }>('SELECT data FROM orders ORDER BY created_at DESC LIMIT $1', [limit]);
  return r.rows.map((x) => x.data);
}

export interface OrderPatch {
  status?: OrderStatus;
  paymentStatus?: 'aprovado' | 'pendente';
  tracking?: { code: string; carrier: string } | null;
}

export function parseOrderPatch(raw: unknown): OrderPatch {
  const r = (raw ?? {}) as Record<string, unknown>;
  const patch: OrderPatch = {};
  if (r.status !== undefined) {
    if (!ORDER_STATUSES.includes(r.status as OrderStatus)) throw new OrderInputError('Status inválido.');
    patch.status = r.status as OrderStatus;
  }
  if (r.paymentStatus !== undefined) {
    if (r.paymentStatus !== 'aprovado' && r.paymentStatus !== 'pendente') throw new OrderInputError('Situação do pagamento inválida.');
    patch.paymentStatus = r.paymentStatus;
  }
  if (r.tracking !== undefined) {
    if (r.tracking === null) patch.tracking = null;
    else {
      const t = r.tracking as Record<string, unknown>;
      const code = typeof t.code === 'string' ? t.code.trim().toUpperCase() : '';
      const carrier = typeof t.carrier === 'string' ? t.carrier.trim().slice(0, 60) : '';
      if (!/^[A-Z0-9-]{6,40}$/.test(code)) throw new OrderInputError('Código de rastreio inválido.');
      patch.tracking = { code, carrier: carrier || 'Transportadora' };
    }
  }
  if (!Object.keys(patch).length) throw new OrderInputError('Nada para alterar.');
  return patch;
}

/** Alteração feita no painel. Cancelar devolve o estoque (uma vez) e é definitivo. */
export async function updateOrder(id: string, patch: OrderPatch): Promise<Order> {
  await ensureDatabase();
  return withTransaction(async (db) => {
    const r = await db.query<{ data: Order }>('SELECT data FROM orders WHERE id = $1 FOR UPDATE', [id]);
    const cur = r.rows[0]?.data;
    if (!cur) throw new OrderInputError('Pedido não encontrado.');
    const at = saoPauloISO();
    const history: OrderEvent[] = [...(cur.history ?? [])];
    let order: Order = { ...cur };

    if (patch.status && patch.status !== cur.status) {
      if (cur.status === 'cancelado') throw new OrderStateError('Pedido cancelado não pode ser reaberto.');
      if (patch.status !== 'pendente') history.push({ type: EVENT_FOR_STATUS[patch.status], at, by: 'admin' });
      order.status = patch.status;
      if (patch.status === 'cancelado') await releaseStockTx(db, id);
    }
    if (patch.paymentStatus && patch.paymentStatus !== cur.payment?.status) {
      if (patch.paymentStatus === 'aprovado') history.push({ type: 'pagamento_aprovado', at, by: 'admin', note: 'Pagamento conferido na Stripe' });
      order.payment = { ...(cur.payment ?? {}), status: patch.paymentStatus, updatedAt: at };
    }
    if (patch.tracking !== undefined) {
      if (patch.tracking === null) order = { ...order, tracking: undefined };
      else {
        order.tracking = { ...patch.tracking, addedAt: at };
        history.push({ type: 'rastreio', at, by: 'admin', note: `Código de rastreio ${patch.tracking.code} (${patch.tracking.carrier})` });
      }
    }
    order = { ...order, history };
    await db.query(`UPDATE orders SET data = $2, status = $3, payment_status = $4, updated_at = now() WHERE id = $1`, [id, JSON.stringify(order), order.status, order.payment?.status ?? 'pendente']);
    return order;
  });
}

export { CommitInputError };

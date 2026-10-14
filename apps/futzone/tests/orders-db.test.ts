import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import type { Size } from '@/types/catalog';
import { seedProducts } from '@/data/products';
import { productPriceKey } from '@/lib/paymentLinks';

/**
 * Pedidos gravados no banco (pagos pelos links da Stripe). Roda com
 * TEST_DATABASE_URL, num schema próprio (`pedidos_teste`) que é APAGADO no início,
 * para não disputar o banco com o teste da sincronização.
 */
const BASE = process.env.TEST_DATABASE_URL;
const SCHEMA = 'pedidos_teste';

const pick = (key: string) => {
  const p = seedProducts.find((x) => productPriceKey(x) === key && x.sizes.some((s) => (x.stock[s] ?? 0) > 0))!;
  return { id: p.id, size: p.sizes.find((s) => (p.stock[s] ?? 0) > 0)! as Size, price: p.price };
};

describe.skipIf(!BASE)('pedidos no banco (Postgres)', () => {
  let db: Client;
  let svc: typeof import('@/server/orders/orders.service');
  let closeDatabase: () => Promise<void>;
  const torcedor = pick('torcedor');
  const retro = pick('retro');
  const customer = { name: 'Ana Souza', email: 'Ana@Exemplo.com', phone: '(11) 98888-7777', cpf: '12345678909' };

  const committed = async (productId: string, size: string) =>
    Number((await db.query(`SELECT committed FROM ${SCHEMA}.product_stock WHERE product_id = $1 AND size = $2`, [productId, size])).rows[0].committed);
  const count = async (sql: string, params: unknown[] = []) => Number((await db.query(sql, params)).rows[0].n);

  beforeAll(async () => {
    db = new Client({ connectionString: BASE });
    await db.connect();
    await db.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE; CREATE SCHEMA ${SCHEMA};`);
    const url = new URL(BASE!);
    url.searchParams.set('options', `-c search_path=${SCHEMA}`);
    process.env.DATABASE_URL = url.toString();
    svc = await import('@/server/orders/orders.service');
    closeDatabase = (await import('@/server/db/migrate')).closeDatabase;
  });

  afterAll(async () => {
    await closeDatabase?.();
    await db?.end();
  });

  it('registra o pedido com número único, preço do banco, baixa no estoque e um pagamento por tipo', async () => {
    const before = await committed(torcedor.id, torcedor.size).catch(() => 0);
    const r = await svc.createOrder({
      orderId: 'o-teste-1',
      customer,
      items: [
        { productId: torcedor.id, size: torcedor.size, quantity: 2, unitPrice: 1 },
        { productId: retro.id, size: retro.size, quantity: 1 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const o = r.order;
    expect(o.number).toBe('FZ-10001');
    expect(o.customerEmail).toBe('ana@exemplo.com');
    expect(o.customerPhone).toBe('11988887777');
    expect(JSON.stringify(o)).not.toContain('12345678909');
    expect(o.lines.find((l) => l.productId === torcedor.id)?.unitPrice).toBe(torcedor.price);
    expect(o.total).toBe(torcedor.price * 2 + retro.price);
    expect(o.shippingCost).toBeUndefined();
    expect(o.payment).toMatchObject({ status: 'pendente', gateway: 'stripe', method: 'link' });
    expect(o.payment?.links).toEqual([
      { key: 'torcedor', label: 'Camisa Torcedor', quantity: 2, amount: torcedor.price * 2, reference: 'FZ-10001-torcedor' },
      { key: 'retro', label: 'Camisa Retrô', quantity: 1, amount: retro.price, reference: 'FZ-10001-retro' },
    ]);
    expect(await committed(torcedor.id, torcedor.size)).toBe(before + 2);
    expect(await count(`SELECT count(*) AS n FROM ${SCHEMA}.orders`)).toBe(1);
  });

  it('o mesmo pedido enviado de novo não duplica nem baixa duas vezes', async () => {
    const before = await committed(torcedor.id, torcedor.size);
    const r = await svc.createOrder({ orderId: 'o-teste-1', customer, items: [{ productId: torcedor.id, size: torcedor.size, quantity: 2 }] });
    expect(r).toMatchObject({ ok: true, repeated: true, order: { number: 'FZ-10001' } });
    // O id sozinho não devolve os dados do pedido de outra pessoa.
    await expect(svc.createOrder({ orderId: 'o-teste-1', customer: { ...customer, email: 'outra@exemplo.com' }, items: [{ productId: torcedor.id, size: torcedor.size, quantity: 1 }] })).rejects.toThrow('Pedido inválido');
    expect(await committed(torcedor.id, torcedor.size)).toBe(before);
    const next = await svc.createOrder({ orderId: 'o-teste-2', customer, items: [{ productId: retro.id, size: retro.size, quantity: 1 }] });
    expect(next.ok && next.order.number).toBe('FZ-10002');
  });

  it('preço diferente do link da Stripe é recusado sem gravar nada', async () => {
    await db.query(`UPDATE ${SCHEMA}.products SET data = jsonb_set(data, '{price}', '19990') WHERE id = $1`, [torcedor.id]);
    const before = await committed(torcedor.id, torcedor.size);
    const r = await svc.createOrder({ orderId: 'o-teste-3', customer, items: [{ productId: torcedor.id, size: torcedor.size, quantity: 1 }] });
    expect(r).toMatchObject({ ok: false, reason: 'preco' });
    expect(await committed(torcedor.id, torcedor.size)).toBe(before);
    expect(await count(`SELECT count(*) AS n FROM ${SCHEMA}.orders WHERE id = 'o-teste-3'`)).toBe(0);
    expect(await count(`SELECT count(*) AS n FROM ${SCHEMA}.stock_commits WHERE order_id = 'o-teste-3'`)).toBe(0);
    await db.query(`UPDATE ${SCHEMA}.products SET data = jsonb_set(data, '{price}', to_jsonb($2::int)) WHERE id = $1`, [torcedor.id, torcedor.price]);
  });

  it('falta de estoque é recusada sem gravar nada (nem os outros itens)', async () => {
    await db.query(`UPDATE ${SCHEMA}.product_stock SET cap = committed WHERE product_id = $1 AND size = $2`, [retro.id, retro.size]);
    const before = await committed(torcedor.id, torcedor.size);
    const r = await svc.createOrder({
      orderId: 'o-teste-4',
      customer,
      items: [
        { productId: torcedor.id, size: torcedor.size, quantity: 1 },
        { productId: retro.id, size: retro.size, quantity: 1 },
      ],
    });
    expect(r).toMatchObject({ ok: false, reason: 'estoque', issues: [{ productId: retro.id, kind: 'indisponivel' }] });
    expect(await committed(torcedor.id, torcedor.size)).toBe(before);
    expect(await count(`SELECT count(*) AS n FROM ${SCHEMA}.orders WHERE id = 'o-teste-4'`)).toBe(0);
    await db.query(`UPDATE ${SCHEMA}.product_stock SET cap = 12 WHERE product_id = $1 AND size = $2`, [retro.id, retro.size]);
  });

  it('dados inválidos são recusados', async () => {
    await expect(svc.createOrder({ orderId: 'o-teste-5', customer: { ...customer, email: 'x' }, items: [{ productId: torcedor.id, size: torcedor.size, quantity: 1 }] })).rejects.toThrow('E-mail inválido');
    await expect(svc.createOrder({ orderId: 'o-teste-5', customer, items: [] })).rejects.toThrow('Itens inválidos');
  });

  it('marcar como pago grava o evento; cancelar devolve o estoque uma vez só e não reabre', async () => {
    const paid = await svc.updateOrder('o-teste-1', { paymentStatus: 'aprovado' });
    expect(paid.payment?.status).toBe('aprovado');
    expect(paid.history?.at(-1)).toMatchObject({ type: 'pagamento_aprovado', by: 'admin' });
    expect(await count(`SELECT count(*) AS n FROM ${SCHEMA}.orders WHERE id = 'o-teste-1' AND payment_status = 'aprovado'`)).toBe(1);

    const before = await committed(torcedor.id, torcedor.size);
    const cancelled = await svc.updateOrder('o-teste-1', { status: 'cancelado' });
    expect(cancelled.status).toBe('cancelado');
    expect(await committed(torcedor.id, torcedor.size)).toBe(before - 2);
    await svc.updateOrder('o-teste-1', { status: 'cancelado' });
    expect(await committed(torcedor.id, torcedor.size)).toBe(before - 2);
    await expect(svc.updateOrder('o-teste-1', { status: 'pendente' })).rejects.toThrow('não pode ser reaberto');

    const listed = await svc.listOrders();
    expect(listed.map((o) => o.number)).toEqual(['FZ-10002', 'FZ-10001']);
  });
});

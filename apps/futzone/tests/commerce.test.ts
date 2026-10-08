import { describe, expect, it } from 'vitest';
import type { Product } from '@/types/catalog';
import type { Address, Order, OrderShipping } from '@/types/commerce';
import { seedProducts } from '@/data/products';
import { DEFAULT_COUPONS, evaluateCoupon } from '@/services/coupons/coupon.service';
import { findStockIssues, STOCK_ISSUE_MESSAGE } from '@/services/inventory.service';
import { buildOrder, buildOrderTimeline, computeTotals, nextOrderNumber } from '@/lib/orders';
import { deriveNotifications } from '@/services/notifications/notifications';
import { recommend } from '@/lib/recommendations';
import { LocalCepProvider } from '@/services/address/cep.service';

const coupon = (code: string) => DEFAULT_COUPONS.find((c) => c.code === code);

describe('cupons', () => {
  it('aplica percentual e valor fixo', () => {
    const pct = evaluateCoupon(coupon('CUPOM10'), { subtotal: 30000, shippingCost: 2490 });
    expect(pct).toMatchObject({ ok: true, discount: 3000 });
    const fixed = evaluateCoupon(coupon('BEMVINDO20'), { subtotal: 30000, shippingCost: null });
    expect(fixed).toMatchObject({ ok: true, discount: 2000 });
  });

  it('respeita pedido mínimo, status e validade', () => {
    expect(evaluateCoupon(coupon('BEMVINDO20'), { subtotal: 10000, shippingCost: null })).toMatchObject({ ok: false, reason: 'minimo' });
    expect(evaluateCoupon({ ...coupon('CUPOM10')!, active: false }, { subtotal: 10000, shippingCost: null })).toMatchObject({ ok: false, reason: 'inativo' });
    expect(evaluateCoupon({ ...coupon('CUPOM10')!, expiresAt: '2026-01-01' }, { subtotal: 10000, shippingCost: null }, '2026-10-08')).toMatchObject({ ok: false, reason: 'expirado' });
    expect(evaluateCoupon(undefined, { subtotal: 10000, shippingCost: null })).toMatchObject({ ok: false, reason: 'nao_encontrado' });
  });

  it('frete grátis zera o frete escolhido e limita o percentual ao teto', () => {
    expect(evaluateCoupon(coupon('FRETEGRATIS'), { subtotal: 30000, shippingCost: 3990 })).toMatchObject({ ok: true, discount: 3990, freeShipping: true });
    expect(evaluateCoupon({ ...coupon('CUPOM10')!, maxDiscount: 1500 }, { subtotal: 30000, shippingCost: null })).toMatchObject({ discount: 1500 });
  });
});

describe('estoque no carrinho', () => {
  const base = seedProducts.find((p) => p.status === 'published' && (p.stock.M ?? 0) > 1)!;
  const soldOut: Product = { ...base, stock: { ...base.stock, M: 0 } };
  const low: Product = { ...base, stock: { ...base.stock, M: 1 } };

  it('detecta produto indisponível e estoque insuficiente', () => {
    const items = [{ productId: base.id, size: 'M' as const, quantity: 2 }];
    expect(findStockIssues(items, [base])).toEqual([]);
    expect(findStockIssues(items, [soldOut])[0]).toMatchObject({ kind: 'indisponivel', available: 0 });
    expect(findStockIssues(items, [low])[0]).toMatchObject({ kind: 'insuficiente', available: 1 });
    expect(findStockIssues(items, [])[0].kind).toBe('indisponivel');
    expect(STOCK_ISSUE_MESSAGE.indisponivel).toBe('Este produto ficou indisponível.');
  });
});

const address: Address = { id: 'a1', label: 'Casa', recipient: 'Ana Souza', street: 'Av. Paulista', number: '1000', district: 'Bela Vista', city: 'São Paulo', state: 'SP', zip: '01310-100', isDefault: true };
const shipping: OrderShipping = { provider: 'mock', isMock: true, serviceId: 'pac', serviceName: 'PAC', carrier: 'Correios', price: 2490, originalPrice: 2490, minDays: 6, maxDays: 9, estimatedFrom: '2026-10-16', estimatedTo: '2026-10-21', destinationZip: '01310100' };

describe('pedidos', () => {
  it('calcula totais com promoção, frete e desconto', () => {
    const t = computeTotals([{ unitPrice: 29990, compareAtPrice: 34990, quantity: 2 }], 2490, 3000);
    expect(t).toEqual({ products: 69980, promoSavings: 10000, subtotal: 59980, shipping: 2490, discount: 3000, total: 59470 });
    expect(computeTotals([{ unitPrice: 1000, quantity: 1 }], null, 99999).total).toBe(0);
  });

  it('monta o pedido aguardando integração de pagamento', () => {
    const totals = computeTotals([{ unitPrice: 29990, quantity: 1 }], 2490);
    const order = buildOrder(
      { customerId: 'c-1', customerName: 'Ana Souza', customerEmail: 'ana@ex.com', guest: false, lines: [{ productId: 'p-1', name: 'Camisa', size: 'M', quantity: 1, unitPrice: 29990 }], address, shipping, totals },
      [{ number: 'FZ-10428' } as Order],
      new Date(2026, 9, 7, 15, 30),
    );
    expect(order.number).toBe('FZ-10429');
    expect(order.status).toBe('pendente');
    expect(order.payment?.status).toBe('aguardando_integracao');
    expect(order.total).toBe(32480);
    expect(order.createdAt).toBe('2026-10-07T15:30:00');
    expect(order.history).toEqual([{ type: 'criado', at: '2026-10-07T15:30:00', by: 'cliente' }]);
    expect(nextOrderNumber([])).toBe('FZ-10001');
  });

  it('linha do tempo: pagamento aguardando integração e rastreio quando enviado', () => {
    const pending = { id: 'o1', number: 'FZ-1', status: 'pendente', createdAt: '2026-10-07T10:00:00', lines: [], total: 0, customerId: 'c', customerName: 'A', payment: { status: 'aguardando_integracao', updatedAt: '' } } as Order;
    const steps = buildOrderTimeline(pending);
    expect(steps.map((s) => s.id)).toEqual(['realizado', 'pagamento', 'preparando', 'enviado', 'transito', 'entregue']);
    expect(steps[1].state).toBe('waiting');
    const sent = buildOrderTimeline({ ...pending, status: 'enviado', tracking: { code: 'AA123456789BR', carrier: 'Correios', addedAt: '' } });
    expect(sent.find((s) => s.id === 'enviado')!.state).toBe('done');
    expect(sent.find((s) => s.id === 'transito')).toMatchObject({ state: 'current', detail: 'Rastreio AA123456789BR' });
  });

  it('gera notificações a partir do histórico, mais recentes primeiro', () => {
    const order = {
      id: 'o1',
      number: 'FZ-1',
      history: [
        { type: 'criado', at: '2026-10-01T10:00:00' },
        { type: 'enviado', at: '2026-10-03T10:00:00' },
      ],
    } as Order;
    const list = deriveNotifications([order], new Set(['o1:criado:2026-10-01T10:00:00']));
    expect(list.map((n) => n.title)).toEqual(['Seu pedido foi enviado.', expect.any(String)]);
    expect(list[1].read).toBe(true);
    expect(list[0].read).toBe(false);
  });
});

describe('recomendações e CEP', () => {
  it('recomenda produtos relacionados sem repetir a referência', () => {
    const ref = seedProducts[0];
    const list = recommend(seedProducts, [ref], { limit: 4 });
    expect(list).toHaveLength(4);
    expect(list.some((p) => p.id === ref.id)).toBe(false);
  });

  it('consulta de CEP local: completa só para endereços já salvos', async () => {
    const provider = new LocalCepProvider(() => [address]);
    expect(await provider.lookup('01310100')).toMatchObject({ complete: true, city: 'São Paulo', street: 'Av. Paulista' });
    expect(await provider.lookup('20040-002')).toMatchObject({ complete: false, state: 'RJ' });
    expect(await provider.lookup('000')).toBeNull();
  });
});

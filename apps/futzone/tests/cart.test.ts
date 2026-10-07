import { describe, expect, it } from 'vitest';
import { seedProducts } from '@/data/products';
import { cartReducer, cartTotals, MAX_PER_ITEM, resolveCart } from '@/lib/cart';

describe('carrinho', () => {
  it('adiciona, agrupa o mesmo tamanho e respeita o estoque', () => {
    let s = cartReducer([], { type: 'add', productId: 'p-001', size: 'M', quantity: 2, maxQuantity: 5 });
    s = cartReducer(s, { type: 'add', productId: 'p-001', size: 'M', quantity: 10, maxQuantity: 5 });
    s = cartReducer(s, { type: 'add', productId: 'p-001', size: 'G', quantity: 1, maxQuantity: 5 });
    expect(s).toEqual([
      { productId: 'p-001', size: 'M', quantity: 5 },
      { productId: 'p-001', size: 'G', quantity: 1 },
    ]);
  });

  it('não ultrapassa o máximo por item', () => {
    const s = cartReducer([], { type: 'add', productId: 'p-013', size: 'M', quantity: 99, maxQuantity: 99 });
    expect(s[0].quantity).toBe(MAX_PER_ITEM);
  });

  it('altera quantidade, remove ao chegar em zero e remove item', () => {
    let s = cartReducer([], { type: 'add', productId: 'p-001', size: 'M', quantity: 2, maxQuantity: 5 });
    s = cartReducer(s, { type: 'set-quantity', productId: 'p-001', size: 'M', quantity: 3, maxQuantity: 5 });
    expect(s[0].quantity).toBe(3);
    expect(cartReducer(s, { type: 'set-quantity', productId: 'p-001', size: 'M', quantity: 0, maxQuantity: 5 })).toEqual([]);
    expect(cartReducer(s, { type: 'remove', productId: 'p-001', size: 'M' })).toEqual([]);
  });

  it('calcula subtotais e total e ignora produtos indisponíveis', () => {
    const [a, b, c] = seedProducts;
    const draft = { ...c, id: 'rascunho', status: 'draft' as const };
    const products = [a, b, draft];
    const items = [
      { productId: a.id, size: a.sizes[0], quantity: 2 },
      { productId: b.id, size: b.sizes[0], quantity: 1 },
      { productId: draft.id, size: draft.sizes[0], quantity: 1 }, // rascunho: não entra
      { productId: 'inexistente', size: 'M' as const, quantity: 1 },
    ];
    const lines = resolveCart(items, products);
    expect(lines).toHaveLength(2);
    const totals = cartTotals(lines);
    expect(totals.count).toBe(3);
    expect(totals.subtotal).toBe(a.price * 2 + b.price);

    const onSale = { ...a, compareAtPrice: a.price + 5000 };
    expect(cartTotals(resolveCart([{ productId: a.id, size: a.sizes[0], quantity: 1 }], [onSale])).savings).toBe(5000);
  });
});

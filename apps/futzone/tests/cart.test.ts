import { describe, expect, it } from 'vitest';
import { seedProducts } from '@/data/products';
import { cartReducer, cartTotals, MAX_PER_ITEM, resolveCart } from '@/lib/cart';
import { availableSizes } from '@/lib/product';

const inStock = seedProducts.filter((p) => availableSizes(p).length > 0);

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

  it('soma só itens disponíveis e marca os indisponíveis em vez de sumir com eles', () => {
    const [a, b, c] = inStock;
    const sizeA = availableSizes(a)[0];
    const sizeB = availableSizes(b)[0];
    const draft = { ...c, id: 'rascunho', status: 'draft' as const };
    const items = [
      { productId: a.id, size: sizeA, quantity: 2 },
      { productId: b.id, size: sizeB, quantity: 1 },
      { productId: draft.id, size: draft.sizes[0], quantity: 1 }, // saiu de venda
      { productId: 'inexistente', size: 'M' as const, quantity: 1 }, // sem cópia salva: descartado
      { productId: 'removido', size: 'M' as const, quantity: 1, snapshot: { name: 'Camisa removida', price: 1000 } },
    ];
    const lines = resolveCart(items, [a, b, draft]);
    expect(lines.map((l) => l.status)).toEqual(['ok', 'ok', 'indisponivel', 'indisponivel']);
    expect(lines[3].name).toBe('Camisa removida');
    const totals = cartTotals(lines);
    expect(totals.validCount).toBe(3);
    expect(totals.issues).toBe(2);
    expect(totals.subtotal).toBe(a.price * 2 + b.price);
  });

  it('marca quantidade acima do estoque como insuficiente', () => {
    const a = inStock[0];
    const size = availableSizes(a)[0];
    const lowStock = { ...a, stock: { ...a.stock, [size]: 1 } };
    const [line] = resolveCart([{ productId: a.id, size, quantity: 3 }], [lowStock]);
    expect(line.status).toBe('insuficiente');
    expect(line.available).toBe(1);
  });

  it('calcula a economia de produtos em promoção', () => {
    const a = inStock[0];
    const onSale = { ...a, compareAtPrice: a.price + 5000 };
    expect(cartTotals(resolveCart([{ productId: a.id, size: availableSizes(a)[0], quantity: 1 }], [onSale])).savings).toBe(5000);
  });
});

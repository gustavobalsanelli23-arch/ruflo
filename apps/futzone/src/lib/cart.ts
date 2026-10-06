import type { Cents, Product, Size } from '@/types/catalog';
import type { CartItem } from '@/types/commerce';
import { stockFor } from './product';

/** Regras do carrinho como reducer puro (testável e independente de React). */

export type CartAction =
  | { type: 'add'; productId: string; size: Size; quantity: number; maxQuantity: number }
  | { type: 'set-quantity'; productId: string; size: Size; quantity: number; maxQuantity: number }
  | { type: 'remove'; productId: string; size: Size }
  | { type: 'clear' }
  | { type: 'replace'; items: CartItem[] };

export const MAX_PER_ITEM = 10;

const sameLine = (item: CartItem, productId: string, size: Size) =>
  item.productId === productId && item.size === size;

const clamp = (qty: number, max: number) => Math.max(0, Math.min(qty, max, MAX_PER_ITEM));

export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((i) => sameLine(i, action.productId, action.size));
      const next = clamp((existing?.quantity ?? 0) + action.quantity, action.maxQuantity);
      if (next === 0) return state;
      if (existing) return state.map((i) => (i === existing ? { ...i, quantity: next } : i));
      return [...state, { productId: action.productId, size: action.size, quantity: next }];
    }
    case 'set-quantity': {
      const next = clamp(action.quantity, action.maxQuantity);
      if (next === 0) return state.filter((i) => !sameLine(i, action.productId, action.size));
      return state.map((i) => (sameLine(i, action.productId, action.size) ? { ...i, quantity: next } : i));
    }
    case 'remove':
      return state.filter((i) => !sameLine(i, action.productId, action.size));
    case 'clear':
      return [];
    case 'replace':
      return action.items;
    default:
      return state;
  }
}

export interface CartLine extends CartItem {
  product: Product;
  unitPrice: Cents;
  subtotal: Cents;
  maxQuantity: number;
}

/** Junta os itens do carrinho com os produtos atuais, descartando itens inválidos. */
export function resolveCart(items: CartItem[], products: Product[]): CartLine[] {
  return items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId && p.status === 'published');
    if (!product || !product.sizes.includes(item.size)) return [];
    const maxQuantity = Math.min(stockFor(product, item.size), MAX_PER_ITEM);
    return [{ ...item, product, unitPrice: product.price, subtotal: product.price * item.quantity, maxQuantity }];
  });
}

export const cartTotals = (lines: CartLine[]) => ({
  count: lines.reduce((n, l) => n + l.quantity, 0),
  subtotal: lines.reduce((n, l) => n + l.subtotal, 0),
  savings: lines.reduce((n, l) => n + ((l.product.compareAtPrice ?? l.unitPrice) - l.unitPrice) * l.quantity, 0),
});

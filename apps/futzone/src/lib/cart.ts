import type { Cents, Product, Size } from '@/types/catalog';
import type { CartItem } from '@/types/commerce';
import { stockFor } from './product';

/** Regras do carrinho como reducer puro (testável e independente de React). */

export type CartAction =
  | { type: 'add'; productId: string; size: Size; quantity: number; maxQuantity: number; snapshot?: CartItem['snapshot'] }
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
      const snapshot = action.snapshot ?? existing?.snapshot;
      const item: CartItem = { productId: action.productId, size: action.size, quantity: next, ...(snapshot ? { snapshot } : {}) };
      if (existing) return state.map((i) => (i === existing ? item : i));
      return [...state, item];
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

export type CartLineStatus = 'ok' | 'insuficiente' | 'indisponivel';

export interface CartLine extends CartItem {
  /** `null` quando o produto saiu do catálogo (exibido pela cópia salva no carrinho). */
  product: Product | null;
  name: string;
  image?: string;
  unitPrice: Cents;
  compareAtPrice?: Cents;
  subtotal: Cents;
  /** Unidades disponíveis agora neste tamanho (0 = indisponível). */
  available: number;
  maxQuantity: number;
  status: CartLineStatus;
}

/**
 * Junta os itens do carrinho com o catálogo atual. Itens que ficaram sem
 * estoque ou saíram de venda NÃO somem: voltam marcados para o cliente decidir.
 */
export function resolveCart(items: CartItem[], products: Product[]): CartLine[] {
  return items.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId) ?? null;
    if (!product && !item.snapshot) return [];
    const sellable = !!product && product.status === 'published' && product.sizes.includes(item.size);
    const available = sellable ? stockFor(product, item.size) : 0;
    const status: CartLineStatus = available <= 0 ? 'indisponivel' : available < item.quantity ? 'insuficiente' : 'ok';
    const unitPrice = product?.price ?? item.snapshot?.price ?? 0;
    return [
      {
        ...item,
        product,
        name: product?.name ?? item.snapshot?.name ?? 'Produto',
        image: product?.images[0]?.src ?? item.snapshot?.image,
        unitPrice,
        compareAtPrice: product?.compareAtPrice,
        subtotal: unitPrice * item.quantity,
        available,
        maxQuantity: Math.min(available, MAX_PER_ITEM),
        status,
      },
    ];
  });
}

/** Totais consideram só os itens disponíveis; `issues` conta os que precisam de ajuste. */
export const cartTotals = (lines: CartLine[]) => {
  const valid = lines.filter((l) => l.status === 'ok');
  return {
    count: lines.reduce((n, l) => n + l.quantity, 0),
    validCount: valid.reduce((n, l) => n + l.quantity, 0),
    subtotal: valid.reduce((n, l) => n + l.subtotal, 0),
    savings: valid.reduce((n, l) => n + Math.max(0, (l.compareAtPrice ?? l.unitPrice) - l.unitPrice) * l.quantity, 0),
    issues: lines.length - valid.length,
  };
};

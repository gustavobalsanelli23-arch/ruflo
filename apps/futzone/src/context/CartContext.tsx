'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { Size } from '@/types/catalog';
import type { CartItem } from '@/types/commerce';
import { cartReducer, cartTotals, MAX_PER_ITEM, resolveCart, type CartLine } from '@/lib/cart';
import { stockFor } from '@/lib/product';
import { readJSON, STORAGE_KEYS, writeJSON } from '@/services/storage';
import { useStoreData } from './StoreDataContext';

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number;
  savings: number;
  isOpen: boolean;
  open(): void;
  close(): void;
  /** Retorna a quantidade efetivamente adicionada (pode ser limitada pelo estoque). */
  add(productId: string, size: Size, quantity?: number): number;
  setQuantity(productId: string, size: Size, quantity: number): void;
  remove(productId: string, size: Size): void;
  clear(): void;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { products } = useStoreData();
  const [items, dispatch] = useReducer(cartReducer, [] as CartItem[]);
  const [isOpen, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    dispatch({ type: 'replace', items: readJSON<CartItem[]>(STORAGE_KEYS.cart, []) });
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeJSON(STORAGE_KEYS.cart, items);
  }, [items, loaded]);

  const lines = useMemo(() => resolveCart(items, products), [items, products]);
  const totals = useMemo(() => cartTotals(lines), [lines]);

  const maxFor = useCallback(
    (productId: string, size: Size) => {
      const product = products.find((p) => p.id === productId);
      return product ? Math.min(stockFor(product, size), MAX_PER_ITEM) : 0;
    },
    [products],
  );

  const add = useCallback(
    (productId: string, size: Size, quantity = 1) => {
      const max = maxFor(productId, size);
      const current = items.find((i) => i.productId === productId && i.size === size)?.quantity ?? 0;
      const added = Math.max(0, Math.min(current + quantity, max) - current);
      if (added > 0) dispatch({ type: 'add', productId, size, quantity: added, maxQuantity: max });
      return added;
    },
    [items, maxFor],
  );

  const value = useMemo<CartState>(
    () => ({
      lines,
      ...totals,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      setQuantity: (productId, size, quantity) =>
        dispatch({ type: 'set-quantity', productId, size, quantity, maxQuantity: maxFor(productId, size) }),
      remove: (productId, size) => dispatch({ type: 'remove', productId, size }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    [lines, totals, isOpen, add, maxFor],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { favoritesRepository, GUEST_OWNER } from '@/services/engagement';
import { useCustomerAuth } from './CustomerAuthContext';

interface FavoritesValue {
  ids: string[];
  isFavorite(productId: string): boolean;
  /** Retorna `true` se o produto passou a ser favorito. */
  toggle(productId: string): boolean;
  remove(productId: string): void;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

/**
 * Favoritos por dono: visitante (neste navegador) ou cliente logado.
 * Ao entrar na conta, os favoritos do visitante são somados aos da conta.
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { session, status } = useCustomerAuth();
  const owner = session?.customerId ?? GUEST_OWNER;
  const [ids, setIds] = useState<string[]>([]);
  const prevOwner = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    let list = favoritesRepository.get(owner);
    if (prevOwner.current === GUEST_OWNER && owner !== GUEST_OWNER) {
      const guest = favoritesRepository.get(GUEST_OWNER);
      if (guest.length) {
        list = Array.from(new Set([...list, ...guest]));
        favoritesRepository.save(owner, list);
        favoritesRepository.save(GUEST_OWNER, []);
      }
    }
    prevOwner.current = owner;
    setIds(list);
  }, [owner, status]);

  const update = useCallback(
    (next: string[]) => {
      setIds(next);
      favoritesRepository.save(owner, next);
    },
    [owner],
  );

  const value = useMemo<FavoritesValue>(
    () => ({
      ids,
      isFavorite: (id) => ids.includes(id),
      toggle: (id) => {
        const adding = !ids.includes(id);
        update(adding ? [id, ...ids] : ids.filter((x) => x !== id));
        return adding;
      },
      remove: (id) => update(ids.filter((x) => x !== id)),
    }),
    [ids, update],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites precisa estar dentro de <FavoritesProvider>');
  return ctx;
}

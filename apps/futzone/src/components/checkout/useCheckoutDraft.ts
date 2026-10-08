'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Address } from '@/types/commerce';
import { readSessionJSON, removeSessionKey, STORAGE_KEYS, writeSessionJSON } from '@/services/storage';

export type CheckoutStep = 1 | 2 | 3 | 4 | 5;

export interface GuestContact {
  name: string;
  email: string;
  phone: string;
  cpf: string;
}

/** Rascunho do checkout (sessionStorage: sobrevive a recarregar a página, some ao fechar a aba). */
export interface CheckoutDraft {
  step: CheckoutStep;
  mode: 'account' | 'guest' | null;
  guest: GuestContact | null;
  /** Endereço salvo escolhido, ou 'avulso' para `oneOffAddress`. */
  addressId: string | null;
  oneOffAddress: Address | null;
  shippingId: string | null;
  couponCode: string | null;
}

export const EMPTY_DRAFT: CheckoutDraft = { step: 1, mode: null, guest: null, addressId: null, oneOffAddress: null, shippingId: null, couponCode: null };

export function useCheckoutDraft() {
  const [draft, setDraft] = useState<CheckoutDraft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDraft({ ...EMPTY_DRAFT, ...readSessionJSON<Partial<CheckoutDraft>>(STORAGE_KEYS.checkoutDraft, {}) });
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeSessionJSON(STORAGE_KEYS.checkoutDraft, draft);
  }, [draft, loaded]);

  const update = useCallback((patch: Partial<CheckoutDraft>) => setDraft((d) => ({ ...d, ...patch })), []);
  const reset = useCallback(() => {
    removeSessionKey(STORAGE_KEYS.checkoutDraft);
    setDraft(EMPTY_DRAFT);
  }, []);

  return { draft, update, reset, loaded };
}

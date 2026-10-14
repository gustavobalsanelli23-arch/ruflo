'use client';

import { useCallback, useEffect, useState } from 'react';
import { readSessionJSON, removeSessionKey, STORAGE_KEYS, writeSessionJSON } from '@/services/storage';

export type CheckoutStep = 1 | 2 | 3;

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
}

export const EMPTY_DRAFT: CheckoutDraft = { step: 1, mode: null, guest: null };

export function useCheckoutDraft() {
  const [draft, setDraft] = useState<CheckoutDraft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Rascunhos do checkout antigo (5 passos, com endereço e frete) viram o atual.
    const saved = readSessionJSON<Partial<CheckoutDraft>>(STORAGE_KEYS.checkoutDraft, {});
    setDraft({
      step: Math.min(Math.max(Number(saved.step) || 1, 1), 3) as CheckoutStep,
      mode: saved.mode === 'account' || saved.mode === 'guest' ? saved.mode : null,
      guest: saved.guest ?? null,
    });
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

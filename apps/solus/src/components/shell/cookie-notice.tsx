'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { LEGAL } from '@/config/legal';
import { setConsent, useConsent } from '@/lib/tracking/consent';

/**
 * Two modes:
 * - Without product analytics configured, SOLUS sets only strictly necessary
 *   cookies, which the LGPD does not make depend on consent: the notice only
 *   informs, with a single "Entendi" button, per document version.
 * - With analytics configured, it asks: "Aceitar" loads PostHog, "Recusar"
 *   keeps only the essentials. Both buttons have the same weight, so refusing
 *   is as easy as accepting.
 */
const KEY = 'solus-aviso-cookies';
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) === LEGAL.version;
  } catch {
    return true;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function acknowledge() {
  try {
    localStorage.setItem(KEY, LEGAL.version);
  } catch {
    // Private mode without storage: the notice simply comes back next visit.
  }
  listeners.forEach((listener) => listener());
}

const PANEL =
  'fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg sm:inset-x-auto sm:left-4 sm:max-w-sm';
const LINK =
  'relative -my-1.5 inline-block py-1.5 font-medium text-brand underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring';
const BUTTON =
  'inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function CookieNotice({ analytics = false }: { analytics?: boolean }) {
  return analytics ? <ConsentBanner /> : <EssentialNotice />;
}

function EssentialNotice() {
  // Server and first client render treat it as seen, so nothing flashes or mismatches.
  const seen = useSyncExternalStore(subscribe, read, () => true);
  if (seen) return null;
  return (
    <section aria-label="Aviso de cookies" className={PANEL}>
      <p className="text-sm leading-6">
        Usamos só cookies essenciais, para manter você conectado e o app funcionando. Nada de anúncios ou rastreamento.{' '}
        <Link href="/cookies" className={LINK}>
          Saiba mais
        </Link>
      </p>
      <button type="button" onClick={acknowledge} className={`mt-3 bg-primary text-primary-foreground hover:bg-primary/85 ${BUTTON}`}>
        Entendi
      </button>
    </section>
  );
}

function ConsentBanner() {
  const consent = useConsent();
  // undefined = still hydrating; anything but null = already answered.
  if (consent !== null) return null;
  return (
    <section aria-label="Preferências de cookies" className={PANEL}>
      <p className="text-sm leading-6">
        Usamos cookies essenciais para o app funcionar e, se você permitir, uma ferramenta de análise para entender como o SOLUS é
        usado e melhorá-lo. Ela não vê os dados da sua empresa. Nada de anúncios.{' '}
        <Link href="/cookies" className={LINK}>
          Saiba mais
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setConsent(true)} className={`bg-primary text-primary-foreground hover:bg-primary/85 ${BUTTON}`}>
          Aceitar
        </button>
        <button type="button" onClick={() => setConsent(false)} className={`border border-border bg-transparent hover:bg-accent ${BUTTON}`}>
          Recusar
        </button>
      </div>
    </section>
  );
}

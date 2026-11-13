'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { LEGAL } from '@/config/legal';

/**
 * SOLUS sets only strictly necessary cookies (session, active organization,
 * invite, recovery, demo), which the LGPD does not make depend on consent.
 * The notice informs; there is nothing optional to accept or refuse, so it
 * has a single "Entendi" button instead of misleading accept/reject choices.
 * The acknowledgement is per document version.
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

export function CookieNotice() {
  // Server and first client render treat it as seen, so nothing flashes or mismatches.
  const seen = useSyncExternalStore(subscribe, read, () => true);
  if (seen) return null;
  return (
    <section
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg sm:inset-x-auto sm:left-4 sm:max-w-sm"
    >
      <p className="text-sm leading-6">
        Usamos só cookies essenciais, para manter você conectado e o app funcionando. Nada de anúncios ou rastreamento.{' '}
        <Link href="/cookies" className="relative -my-1.5 inline-block py-1.5 font-medium text-brand underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Saiba mais
        </Link>
      </p>
      <button
        type="button"
        onClick={acknowledge}
        className="mt-3 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Entendi
      </button>
    </section>
  );
}

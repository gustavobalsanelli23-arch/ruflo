'use client';

import { resetConsent, useConsent } from '@/lib/tracking/consent';

/** On /cookies: shows the current choice and lets the visitor answer again. */
export function ConsentReset() {
  const consent = useConsent();
  const label = consent === 'granted' ? 'aceita' : consent === 'denied' ? 'recusada' : 'ainda não respondida';
  return (
    <p>
      Sua escolha neste navegador: <strong>{consent === undefined ? '…' : label}</strong>.{' '}
      <button
        type="button"
        onClick={resetConsent}
        className="relative -my-1.5 inline-block py-1.5 font-medium text-brand underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Mudar minha escolha
      </button>
    </p>
  );
}

'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Notice } from '@/components/data/states';
import { confirmEmailLinkAction } from './actions';
import { SubmitButton } from './form-kit';
import { IDLE } from './form-state';

/**
 * E-mail links are confirmed with a button press, not on page load: mail
 * scanners that prefetch links would otherwise spend the one-time token
 * before the person ever clicks it.
 */
export function ConfirmLinkForm({ params, recovery }: { params: Record<string, string>; recovery: boolean }) {
  const [state, formAction, pending] = useActionState(confirmEmailLinkAction, IDLE);
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {Object.entries(params).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.status === 'error' && (
        <Notice tone="error" title="Link inválido">
          {state.message}{' '}
          <Link href={recovery ? '/recuperar-senha' : '/entrar'} className="font-medium text-brand underline-offset-4 hover:underline">
            {recovery ? 'Pedir novo link' : 'Ir para entrar'}
          </Link>
        </Notice>
      )}
      <SubmitButton pending={pending} pendingLabel="Confirmando…" disabled={state.status === 'error'}>
        {recovery ? 'Continuar para nova senha' : 'Confirmar e-mail'}
      </SubmitButton>
    </form>
  );
}

'use client';

import { useActionState, useEffect, useState } from 'react';
import { Notice } from '@/components/data/states';
import { resendConfirmationAction } from './actions';
import { SubmitButton } from './form-kit';
import { IDLE, type FormState } from './form-state';

const COOLDOWN_SECONDS = 60;

type ResendState = FormState & { sentAt?: number };

async function resend(previous: ResendState, formData: FormData): Promise<ResendState> {
  const result = await resendConfirmationAction(previous, formData);
  return { ...result, sentAt: result.status === 'success' ? Date.now() : undefined };
}

/** Sends the confirmation e-mail again, at most once a minute per screen. */
export function ResendConfirmation({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(resend, IDLE as ResendState);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!state.sentAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.sentAt]);

  const elapsed = state.sentAt ? Math.floor((now - state.sentAt) / 1000) : COOLDOWN_SECONDS;
  const cooldown = Math.min(COOLDOWN_SECONDS, Math.max(0, COOLDOWN_SECONDS - elapsed));

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <SubmitButton variant="outline" pending={pending} pendingLabel="Enviando…" disabled={cooldown > 0}>
        {cooldown > 0 ? `Reenviar em ${cooldown} s` : 'Reenviar link de confirmação'}
      </SubmitButton>
      {state.status === 'success' && <Notice tone="success" title="Pedido recebido">{state.message}</Notice>}
      {state.status === 'error' && <Notice tone="error" title="Não foi possível reenviar">{state.message}</Notice>}
    </form>
  );
}

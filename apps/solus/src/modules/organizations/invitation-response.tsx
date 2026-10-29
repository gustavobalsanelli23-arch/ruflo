'use client';

import { useState, useTransition } from 'react';
import { Notice } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/modules/auth/form-kit';
import type { FormState } from '@/modules/auth/form-state';
import { acceptInvitationAction, dismissInvitationAction } from './actions';

/** Accept or postpone an invitation. Acceptance happens in the database (accept_invitation). */
export function InvitationResponse({ token, canAccept }: { token: string; canAccept: boolean }) {
  const [result, setResult] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {result?.status === 'error' && (
        <Notice tone="error" title="Não foi possível aceitar">
          {result.message}
        </Notice>
      )}
      {canAccept && (
        <form
          action={() =>
            startTransition(async () => {
              setResult(await acceptInvitationAction(token));
            })
          }
        >
          <SubmitButton pending={pending} pendingLabel="Entrando na organização…">
            Aceitar convite
          </SubmitButton>
        </form>
      )}
      <form action={dismissInvitationAction}>
        <Button type="submit" variant={canAccept ? 'ghost' : 'outline'} className="h-10 w-full">
          {canAccept ? 'Agora não' : 'Continuar para a SOLUS'}
        </Button>
      </form>
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { signOutAction } from '@/modules/auth/actions';
import { announceSignOut } from './session-watch';

export function useSignOut() {
  const [pending, startTransition] = useTransition();
  const signOut = () =>
    startTransition(async () => {
      announceSignOut();
      await signOutAction();
    });
  return { signOut, pending };
}

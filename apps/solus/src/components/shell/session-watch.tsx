'use client';

import { useEffect } from 'react';
import { loginPath, type LoginReason } from '@/lib/auth/redirect';
import { sessionStatusAction } from '@/modules/auth/actions';

const CHANNEL = 'solus-auth';
const RECHECK_AFTER_MS = 60_000;

function leave(reason: LoginReason) {
  window.location.assign(loginPath({ next: `${window.location.pathname}${window.location.search}`, reason }));
}

/** Tells other open tabs that this person signed out. */
export function announceSignOut() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage('signed-out');
  channel.close();
}

/**
 * Notices an ended session without waiting for the next navigation: a sign
 * out in another tab, or a session that expired while the tab sat in the
 * background. Either way the person lands on the sign-in screen with the
 * reason, and returns to the same page afterwards.
 */
export function SessionWatch() {
  useEffect(() => {
    const check = async (reason: LoginReason) => {
      try {
        const { active } = await sessionStatusAction();
        if (!active) leave(reason);
      } catch {
        // Offline or server unreachable: the next navigation checks again.
      }
    };

    // The other tab announces before its sign-out finishes; check shortly after.
    let pendingCheck: number | undefined;
    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
    const onMessage = (event: MessageEvent) => {
      if (event.data !== 'signed-out') return;
      window.clearTimeout(pendingCheck);
      pendingCheck = window.setTimeout(() => check('sessao-encerrada'), 1500);
    };
    channel?.addEventListener('message', onMessage);

    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt >= RECHECK_AFTER_MS) void check('sessao-expirada');
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearTimeout(pendingCheck);
      channel?.removeEventListener('message', onMessage);
      channel?.close();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return null;
}

/** For Server Action results: an expired session goes back to sign-in. */
export function redirectIfSignedOut(result: { code?: string }) {
  if (result.code !== 'unauthenticated') return false;
  leave('sessao-expirada');
  return true;
}

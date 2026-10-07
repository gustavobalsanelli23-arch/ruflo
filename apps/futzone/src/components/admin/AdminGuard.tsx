'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AdminSessionInfo } from '@/lib/auth/types';
import { localActivityRepository, makeActivity, trackAccess, type AdminActivity, type AdminActivityKind } from '@/lib/admin/activity';

interface AdminContextValue {
  session: AdminSessionInfo;
  /** Acesso anterior deste administrador neste navegador. */
  previousAccess: string | null;
  activity: AdminActivity[];
  log(kind: AdminActivityKind, message: string): void;
  logout(): Promise<void>;
  loggingOut: boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

const REVALIDATE_MS = 5 * 60_000;

/**
 * Guarda do lado do cliente. A proteção real acontece no servidor (proxy +
 * layout); aqui apenas mantemos a interface coerente com a sessão:
 * revalida periodicamente, ao voltar para a aba e quando o navegador
 * restaura a página do histórico (botão voltar após sair).
 */
export function AdminGuard({ session, children }: { session: AdminSessionInfo; children: React.ReactNode }) {
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [previousAccess, setPreviousAccess] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const goToLogin = useCallback(() => window.location.replace('/admin/login'), []);

  useEffect(() => {
    const { previous, isNewSession } = trackAccess(session.admin.id, session.issuedAt);
    if (isNewSession) localActivityRepository.add(makeActivity(session.admin, 'auth', 'entrou no painel'));
    setActivity(localActivityRepository.list());
    setPreviousAccess(previous);
  }, [session.admin, session.issuedAt]);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store', credentials: 'same-origin' });
        if (res.status === 401) goToLogin();
      } catch {
        /* sem rede: mantém a tela; o servidor continua exigindo sessão */
      }
    };
    const onShow = (e: PageTransitionEvent) => e.persisted && check();
    const onVisible = () => document.visibilityState === 'visible' && check();
    const timer = window.setInterval(check, REVALIDATE_MS);
    const expiry = window.setTimeout(goToLogin, Math.max(0, new Date(session.expiresAt).getTime() - Date.now()));
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(expiry);
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [goToLogin, session.expiresAt]);

  const log = useCallback(
    (kind: AdminActivityKind, message: string) => {
      const entry = makeActivity(session.admin, kind, message);
      localActivityRepository.add(entry);
      setActivity((list) => [entry, ...list]);
    },
    [session.admin],
  );

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      // replace: a página do painel sai do histórico do navegador.
      goToLogin();
    }
  }, [goToLogin]);

  const value = useMemo(() => ({ session, previousAccess, activity, log, logout, loggingOut }), [session, previousAccess, activity, log, logout, loggingOut]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin precisa estar dentro de <AdminGuard>.');
  return ctx;
}

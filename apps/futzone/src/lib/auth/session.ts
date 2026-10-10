import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { readAuthConfig } from './config';
import { randomId, signToken } from './token';
import { readValidPayload, resolveSession, SESSION_COOKIE } from './verify';
import { isSameOriginRequest } from './origin';
import { revocationStore } from './revocation';
import { ADMIN_ROLE, type AdminSessionInfo, type AdminTokenPayload } from './types';

/**
 * Camada de acesso (DAL) da autenticação administrativa.
 * Toda rota, página ou ação do painel deve passar por `requireAdmin*`.
 */

export { SESSION_COOKIE, resolveSession };
export const SESSION_TTL_SEC = 8 * 60 * 60; // 8 horas

export async function getAdminSession(): Promise<AdminSessionInfo | null> {
  const store = await cookies();
  return resolveSession(store.get(SESSION_COOKIE)?.value);
}

/** Para páginas/layouts: sem sessão de ADMIN válida → tela de login. */
export async function requireAdmin(): Promise<AdminSessionInfo> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

/** Para rotas de API: retorna a sessão ou uma resposta 401 pronta. */
export async function requireAdminApi(): Promise<{ session: AdminSessionInfo; error?: never } | { session?: never; error: Response }> {
  const session = await getAdminSession();
  if (!session) return { error: Response.json({ error: 'Não autorizado.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } }) };
  return { session };
}

/** Logout: a sessão atual passa a ser recusada no servidor, mesmo que o token seja reenviado. */
export async function revokeCurrentSession(): Promise<boolean> {
  const store = await cookies();
  const payload = await readValidPayload(store.get(SESSION_COOKIE)?.value);
  if (!payload) return false;
  await revocationStore.revoke(payload.sid, payload.exp);
  return true;
}

export async function issueSessionToken(adminId: string): Promise<{ token: string; payload: AdminTokenPayload }> {
  const config = readAuthConfig();
  if (!config.secret) throw new Error('Sessão administrativa não configurada.');
  const iat = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = { sub: adminId, role: ADMIN_ROLE, sid: randomId(), iat, exp: iat + SESSION_TTL_SEC, ver: config.sessionVersion };
  return { token: await signToken(payload, config.secret), payload };
}

/** Proteção CSRF para POSTs: a origem precisa ser o próprio site. */
export async function isSameOrigin(): Promise<boolean> {
  return isSameOriginRequest(await headers());
}

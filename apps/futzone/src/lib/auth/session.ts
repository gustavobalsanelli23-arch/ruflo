import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { readAuthConfig } from './config';
import { randomId, signToken } from './token';
import { resolveSession, SESSION_COOKIE } from './verify';
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

export async function issueSessionToken(adminId: string): Promise<{ token: string; payload: AdminTokenPayload }> {
  const config = readAuthConfig();
  if (!config.secret) throw new Error('Sessão administrativa não configurada.');
  const iat = Math.floor(Date.now() / 1000);
  const payload: AdminTokenPayload = { sub: adminId, role: ADMIN_ROLE, sid: randomId(), iat, exp: iat + SESSION_TTL_SEC, ver: config.sessionVersion };
  return { token: await signToken(payload, config.secret), payload };
}

export const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge,
});

/** Proteção CSRF para POSTs: a origem precisa ser o próprio site. */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get('origin');
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

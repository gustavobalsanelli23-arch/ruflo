import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { loginPath } from '@/lib/auth/redirect';
import { getSupabaseConfig } from '@/lib/env';
import { buildContentSecurityPolicy, createNonce } from '@/lib/security/headers';
import { hardenCookie, isSessionCookie, SESSION_COOKIE_OPTIONS } from '@/lib/supabase/cookies';
import type { Database } from '@/types/database';

/**
 * Runs before every page request:
 *   1. refreshes the Supabase session (rotating cookies when the access token
 *      expired) and verifies the JWT with getClaims();
 *   2. keeps anonymous visitors out of private routes and signed-in people out
 *      of the sign-in screens;
 *   3. sets a per-request CSP nonce.
 * Pages and Server Actions check the session again: this is the first gate,
 * not the only one.
 */

const PRIVATE_PREFIXES = [
  '/visao-geral',
  '/lucratividade',
  '/estoque',
  '/oportunidades',
  '/analista',
  '/dados',
  '/configuracoes',
  '/organizacoes',
  '/convite',
  '/redefinir-senha',
];
const GUEST_ONLY = ['/entrar', '/cadastro'];
const INVITE_PATH = /^\/convite\/([0-9a-f]{64})$/;

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

interface PendingCookie {
  name: string;
  value: string;
  options: Parameters<typeof hardenCookie>[0];
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isDev = process.env.NODE_ENV === 'development';
  const nonce = createNonce();
  const supabaseUrl = getSupabaseConfig()?.url;
  const csp = buildContentSecurityPolicy(nonce, isDev, supabaseUrl ? new URL(supabaseUrl).origin : null);

  const pending: PendingCookie[] = [];
  const extraHeaders: Record<string, string> = {};
  const hadSessionCookie = request.cookies.getAll().some((cookie) => isSessionCookie(cookie.name));
  let userId: string | null = null;

  const config = getSupabaseConfig();
  if (config) {
    const supabase = createServerClient<Database>(config.url, config.publishableKey, {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          for (const cookie of toSet) {
            request.cookies.set(cookie.name, cookie.value);
            pending.push(cookie);
          }
          Object.assign(extraHeaders, headers);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub && data.claims.role === 'authenticated') userId = data.claims.sub;
  }

  const isServerAction = request.headers.has('next-action');
  let redirectTo: string | null = null;
  let rememberInvite: string | null = null;

  if (!isServerAction) {
    if (pathname === '/') {
      redirectTo = userId ? '/visao-geral' : '/entrar';
    } else if (!userId && matches(pathname, PRIVATE_PREFIXES)) {
      if (pathname === '/redefinir-senha') {
        redirectTo = '/recuperar-senha?motivo=link-expirado';
      } else {
        rememberInvite = INVITE_PATH.exec(pathname)?.[1] ?? null;
        redirectTo = config
          ? loginPath({ next: `${pathname}${search}`, reason: hadSessionCookie ? 'sessao-expirada' : undefined })
          : '/entrar';
      }
    } else if (userId && matches(pathname, GUEST_ONLY)) {
      redirectTo = '/visao-geral';
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  requestHeaders.set('x-solus-path', `${pathname}${search}`);

  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, request.url))
    : NextResponse.next({ request: { headers: requestHeaders } });

  for (const { name, value, options } of pending) response.cookies.set(name, value, hardenCookie(options));
  for (const [key, value] of Object.entries(extraHeaders)) response.headers.set(key, value);
  if (rememberInvite) {
    response.cookies.set('solus-convite', rememberInvite, { ...SESSION_COOKIE_OPTIONS, maxAge: 60 * 60 * 24 });
  }
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)'],
};

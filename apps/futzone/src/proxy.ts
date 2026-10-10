import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookieHeader } from '@/lib/auth/cookie';
import { isSameOriginRequest, SAFE_METHODS } from '@/lib/auth/origin';
import { resolveSession, SESSION_COOKIE } from '@/lib/auth/verify';

/**
 * Primeira barreira do painel: roda no servidor ANTES de qualquer página ou
 * API administrativa, em toda requisição (inclusive navegação interna).
 *   - escrita em /api/admin/* vinda de outro site → 403 (CSRF)
 *   - sem sessão de ADMIN válida: páginas → /admin/login · APIs → 401
 * "Sessão válida" = token assinado pelo servidor, role ADMIN, dentro da
 * validade, não encerrado no logout e de uma conta configurada no servidor.
 * O layout do painel e cada rota de API validam a sessão de novo (defesa em
 * profundidade) — o proxy sozinho nunca é a única proteção.
 */

const PUBLIC_PATHS = new Set(['/admin/login', '/api/admin/login']);

function secure(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'same-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');

  if (isApi && !SAFE_METHODS.has(request.method) && !isSameOriginRequest(request.headers)) {
    return secure(NextResponse.json({ error: 'Origem não permitida.' }, { status: 403 }));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await resolveSession(token);

  if (PUBLIC_PATHS.has(pathname)) {
    if (session && pathname === '/admin/login') return secure(NextResponse.redirect(new URL('/admin', request.url)));
    return secure(NextResponse.next());
  }

  if (!session) {
    const res = isApi
      ? NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
      : NextResponse.redirect(
          (() => {
            const login = new URL('/admin/login', request.url);
            if (pathname !== '/admin') login.searchParams.set('next', pathname + search);
            return login;
          })(),
        );
    // Cookie inválido, expirado ou encerrado: descarta no navegador.
    if (token) res.headers.append('Set-Cookie', clearSessionCookieHeader());
    return secure(res);
  }

  return secure(NextResponse.next());
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};

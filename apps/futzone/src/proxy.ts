import { NextResponse, type NextRequest } from 'next/server';
import { resolveSession, SESSION_COOKIE } from '@/lib/auth/verify';

/**
 * Primeira barreira do painel: roda no servidor ANTES de qualquer página ou
 * API administrativa. Sem sessão válida com role ADMIN:
 *   - páginas /admin/*  → redireciona para /admin/login
 *   - APIs /api/admin/* → 401
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
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await resolveSession(token);

  if (PUBLIC_PATHS.has(pathname)) {
    if (session && pathname === '/admin/login') return secure(NextResponse.redirect(new URL('/admin', request.url)));
    return secure(NextResponse.next());
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return secure(NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }));
    }
    const login = new URL('/admin/login', request.url);
    if (pathname !== '/admin') login.searchParams.set('next', pathname + search);
    const res = NextResponse.redirect(login);
    if (token) res.cookies.delete(SESSION_COOKIE);
    return secure(res);
  }

  return secure(NextResponse.next());
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};

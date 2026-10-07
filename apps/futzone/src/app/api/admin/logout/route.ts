import { isSameOrigin, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Encerra a sessão: o cookie é apagado e o navegador não reaproveita páginas em cache. */
export async function POST() {
  if (!(await isSameOrigin())) return Response.json({ error: 'Origem não permitida.' }, { status: 403 });
  const opts = sessionCookieOptions(0);
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Clear-Site-Data': '"cache"',
      'Set-Cookie': `${SESSION_COOKIE}=; Path=${opts.path}; Max-Age=0; HttpOnly; SameSite=Strict${opts.secure ? '; Secure' : ''}`,
    },
  });
}

import { clearSessionCookieHeader } from '@/lib/auth/cookie';
import { isSameOrigin, revokeCurrentSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Encerra a sessão: o id da sessão é revogado no servidor (o mesmo token não
 * volta a funcionar), o cookie é apagado e o cache do painel é descartado.
 */
export async function POST() {
  if (!(await isSameOrigin())) return Response.json({ error: 'Origem não permitida.' }, { status: 403 });
  await revokeCurrentSession();
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Clear-Site-Data': '"cache"',
      'Set-Cookie': clearSessionCookieHeader(),
    },
  });
}

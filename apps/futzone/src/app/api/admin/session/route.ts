import { requireAdminApi } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Sessão atual do administrador (o painel revalida periodicamente e ao voltar no histórico). */
export async function GET() {
  const { session, error } = await requireAdminApi();
  if (error) return error;
  return Response.json(session, { headers: { 'Cache-Control': 'no-store' } });
}

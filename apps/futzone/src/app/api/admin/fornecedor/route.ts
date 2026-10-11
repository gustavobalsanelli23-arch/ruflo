import { requireAdminApi } from '@/lib/auth/session';
import { isDbConfigured } from '@/server/db/client';
import { getStatus, listChanges, listReview, listRuns, listTeamMap } from '@/server/supplier/overview';
import { adminChecks, DB_MISSING, json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Visão geral da integração: status, histórico, aprovações pendentes e times. */
export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ needsDb: false });
  if (denied) return denied;
  if (!isDbConfigured()) return json({ database: false, message: DB_MISSING });
  try {
    const [status, runs, review, pendingChanges, teams] = await Promise.all([
      getStatus(),
      listRuns(20),
      listReview(),
      listChanges({ state: 'pending', limit: 300 }),
      listTeamMap(),
    ]);
    return json({ database: true, status, runs, review, pendingChanges: pendingChanges.filter((c) => c.kind !== 'novo'), teams });
  } catch (err) {
    console.error('[fornecedor] falha ao ler o banco', err);
    return json({ database: true, error: 'Não foi possível ler o banco de dados agora.' }, 503);
  }
}

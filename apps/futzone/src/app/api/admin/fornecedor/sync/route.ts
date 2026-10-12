import { requireAdminApi } from '@/lib/auth/session';
import { runSync, SyncBusyError } from '@/server/supplier/sync.service';
import { catalogChanged } from '@/server/catalog/public';
import { adminChecks, json } from '@/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** "Sincronizar agora". */
export async function POST() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ write: true });
  if (denied) return denied;
  try {
    const outcome = await runSync({ trigger: 'manual', onCatalogChanged: catalogChanged });
    return json(outcome, outcome.status === 'ok' ? 200 : 502);
  } catch (err) {
    if (err instanceof SyncBusyError) return json({ error: err.message }, 409);
    console.error('[fornecedor] sincronização', err);
    return json({ error: 'Falha inesperada na sincronização. O catálogo não foi alterado.' }, 500);
  }
}

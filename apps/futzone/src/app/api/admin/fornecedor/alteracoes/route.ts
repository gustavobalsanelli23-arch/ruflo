import { requireAdminApi } from '@/lib/auth/session';
import { CHANGE_KIND_LABEL } from '@/types/supplier';
import { listChanges } from '@/server/supplier/overview';
import { adminChecks, json } from '@/server/http';

export const dynamic = 'force-dynamic';

const STATES = new Set(['applied', 'pending', 'approved', 'rejected']);

/** Histórico de alterações (?runId= &kind= &state=). */
export async function GET(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks();
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const kind = q.get('kind') ?? undefined;
  const state = q.get('state') ?? undefined;
  const runId = q.get('runId') ? Number(q.get('runId')) : undefined;
  if (kind && !(kind in CHANGE_KIND_LABEL)) return json({ error: 'Tipo inválido.' }, 400);
  if (state && !STATES.has(state)) return json({ error: 'Situação inválida.' }, 400);
  if (runId !== undefined && !Number.isInteger(runId)) return json({ error: 'Execução inválida.' }, 400);
  return json({ changes: await listChanges({ kind, state, runId, limit: 300 }) });
}

import { requireAdminApi } from '@/lib/auth/session';
import { DecisionError, mapSupplierTeam } from '@/server/supplier/decisions';
import { adminChecks, json, readJsonBody } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Liga um time do fornecedor a um time da loja ({ supplierTeamId, teamId | null }). */
export async function PUT(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ write: true });
  if (denied) return denied;
  try {
    const body = (await readJsonBody(request, 5_000)) as { supplierTeamId?: unknown; teamId?: unknown };
    if (typeof body.supplierTeamId !== 'string' || !(typeof body.teamId === 'string' || body.teamId === null)) return json({ error: 'Dados inválidos.' }, 400);
    await mapSupplierTeam(body.supplierTeamId, body.teamId);
    return json({ ok: true });
  } catch (err) {
    if (err instanceof DecisionError) return json({ error: err.message }, 400);
    if (err instanceof SyntaxError) return json({ error: 'Requisição inválida.' }, 400);
    throw err;
  }
}

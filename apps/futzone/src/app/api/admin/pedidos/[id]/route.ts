import { requireAdminApi } from '@/lib/auth/session';
import { catalogChanged } from '@/server/catalog/public';
import { OrderInputError, OrderStateError, parseOrderPatch, updateOrder } from '@/server/orders/orders.service';
import { adminChecks, json, readJsonBody } from '@/server/http';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Altera status ({ status }), pagamento ({ paymentStatus }) ou rastreio ({ tracking }). */
export async function PATCH(request: Request, ctx: Ctx) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ write: true });
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const patch = parseOrderPatch(await readJsonBody(request, 10_000));
    const order = await updateOrder(id, patch);
    // Cancelar devolve estoque: o catálogo público precisa ver na hora.
    if (patch.status === 'cancelado') catalogChanged();
    return json({ ok: true, order });
  } catch (err) {
    if (err instanceof OrderInputError) return json({ error: err.message }, 400);
    if (err instanceof OrderStateError) return json({ error: err.message }, 409);
    if (err instanceof SyntaxError) return json({ error: 'Requisição inválida.' }, 400);
    throw err;
  }
}

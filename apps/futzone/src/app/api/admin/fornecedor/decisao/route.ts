import { requireAdminApi } from '@/lib/auth/session';
import { approveChange, approveProduct, DecisionError, rejectChange, rejectProduct } from '@/server/supplier/decisions';
import { catalogChanged } from '@/server/catalog/public';
import { adminChecks, json, readJsonBody } from '@/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Aprovar/rejeitar: { action: 'approve' | 'reject', productId } para produto novo,
 * ou { action, changeId } para mudança de preço/fotos. `price` (centavos) opcional
 * ao aprovar um produto novo.
 */
export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ write: true });
  if (denied) return denied;
  try {
    const body = (await readJsonBody(request, 10_000)) as { action?: string; productId?: unknown; changeId?: unknown; price?: unknown };
    const approve = body.action === 'approve';
    if (!approve && body.action !== 'reject') return json({ error: 'Ação inválida.' }, 400);
    let warnings: string[] = [];
    if (typeof body.productId === 'string') {
      const price = body.price === undefined || body.price === null ? undefined : Number(body.price);
      if (approve) warnings = (await approveProduct(body.productId, { price })).warnings;
      else await rejectProduct(body.productId);
    } else if (typeof body.changeId === 'number' && Number.isInteger(body.changeId)) {
      if (approve) warnings = (await approveChange(body.changeId)).warnings;
      else await rejectChange(body.changeId);
    } else {
      return json({ error: 'Informe o produto ou a alteração.' }, 400);
    }
    catalogChanged();
    return json({ ok: true, warnings });
  } catch (err) {
    if (err instanceof DecisionError) return json({ error: err.message }, 409);
    if (err instanceof SyntaxError) return json({ error: 'Requisição inválida.' }, 400);
    console.error('[fornecedor] decisão', err);
    return json({ error: 'Não foi possível concluir agora.' }, 500);
  }
}

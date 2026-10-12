import { requireAdminApi } from '@/lib/auth/session';
import type { ProductStatus, Size } from '@/types/catalog';
import { ProductInputError, removeAdminProduct, setAdminStatus, setAdminStock } from '@/server/catalog/adminProducts';
import { catalogChanged } from '@/server/catalog/public';
import { adminChecks, json, readJsonBody } from '@/server/http';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Altera a situação ({ status }) ou o estoque de um tamanho ({ size, quantity }). */
export async function PATCH(request: Request, ctx: Ctx) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ write: true });
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const body = (await readJsonBody(request, 10_000)) as { status?: ProductStatus; size?: Size; quantity?: number };
    if (body.status !== undefined) await setAdminStatus(id, body.status);
    else if (body.size !== undefined) await setAdminStock(id, body.size, Number(body.quantity));
    else return json({ error: 'Nada para alterar.' }, 400);
    catalogChanged();
    return json({ ok: true });
  } catch (err) {
    if (err instanceof ProductInputError) return json({ error: err.message }, 400);
    if (err instanceof SyntaxError) return json({ error: 'Requisição inválida.' }, 400);
    throw err;
  }
}

/** Arquiva (produto com pedidos ou do fornecedor) ou apaga (criado à mão, nunca vendido). */
export async function DELETE(_request: Request, ctx: Ctx) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ write: true });
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const result = await removeAdminProduct(id);
    catalogChanged();
    return json({ ok: true, result });
  } catch (err) {
    if (err instanceof ProductInputError) return json({ error: err.message }, 400);
    throw err;
  }
}

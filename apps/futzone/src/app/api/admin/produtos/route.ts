import { requireAdminApi } from '@/lib/auth/session';
import type { ProductInput } from '@/types/catalog';
import { listAdminProducts, ProductInputError, saveAdminProduct } from '@/server/catalog/adminProducts';
import { catalogChanged } from '@/server/catalog/public';
import { isDbConfigured } from '@/server/db/client';
import { adminChecks, json, readJsonBody } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Todos os produtos (inclusive rascunhos e aguardando aprovação), só para o painel. */
export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ needsDb: false });
  if (denied) return denied;
  if (!isDbConfigured()) return json({ source: 'local' });
  return json({ source: 'db', products: await listAdminProducts() });
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ write: true });
  if (denied) return denied;
  try {
    const id = await saveAdminProduct((await readJsonBody(request)) as ProductInput);
    catalogChanged();
    return json({ ok: true, id });
  } catch (err) {
    if (err instanceof ProductInputError) return json({ error: err.message }, 400);
    if (err instanceof SyntaxError) return json({ error: 'Requisição inválida.' }, 400);
    throw err;
  }
}

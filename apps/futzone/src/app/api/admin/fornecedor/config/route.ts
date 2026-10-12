import { requireAdminApi } from '@/lib/auth/session';
import { sanitizePriceRules } from '@/lib/pricing';
import { saveIntegrationSettings, savePriceRules } from '@/server/supplier/decisions';
import { catalogChanged } from '@/server/catalog/public';
import { adminChecks, json, readJsonBody } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Salva as opções da integração ({ settings }) ou a tabela de preços ({ priceRules }). */
export async function PUT(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const denied = await adminChecks({ write: true });
  if (denied) return denied;
  try {
    const body = (await readJsonBody(request, 10_000)) as { settings?: unknown; priceRules?: unknown };
    if (body.settings !== undefined) return json({ ok: true, settings: await saveIntegrationSettings(body.settings) });
    if (body.priceRules !== undefined) {
      const result = await savePriceRules(sanitizePriceRules(body.priceRules));
      if (!result.pending && result.changes) catalogChanged();
      return json({ ok: true, ...result });
    }
    return json({ error: 'Nada para salvar.' }, 400);
  } catch (err) {
    if (err instanceof SyntaxError) return json({ error: 'Requisição inválida.' }, 400);
    throw err;
  }
}

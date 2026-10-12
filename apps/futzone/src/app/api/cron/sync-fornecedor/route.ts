import { timingSafeEqual, utf8 } from '@/lib/auth/encoding';
import { getPool, isDbConfigured } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';
import { getIntegrationSettings } from '@/server/catalog/store';
import { runSync, SyncBusyError } from '@/server/supplier/sync.service';
import { catalogChanged } from '@/server/catalog/public';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Sincronização agendada (Vercel Cron, vercel.json). A Vercel envia
 * `Authorization: Bearer <CRON_SECRET>`; sem o segredo configurado, a rota recusa.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get('authorization') ?? '';
  if (!secret || !timingSafeEqual(utf8(given), utf8(`Bearer ${secret}`))) return json({ error: 'Não autorizado.' }, 401);
  if (!isDbConfigured()) return json({ skipped: 'Banco de dados não configurado.' });
  await ensureDatabase();
  const settings = await getIntegrationSettings(getPool());
  if (!settings.autoSync) return json({ skipped: 'Sincronização automática desativada no painel.' });
  try {
    const outcome = await runSync({ trigger: 'cron', onCatalogChanged: catalogChanged });
    return json(outcome, outcome.status === 'ok' ? 200 : 502);
  } catch (err) {
    if (err instanceof SyncBusyError) return json({ skipped: err.message });
    throw err;
  }
}

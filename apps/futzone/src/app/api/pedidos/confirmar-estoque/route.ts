import { headers } from 'next/headers';
import { isSameOrigin } from '@/lib/auth/session';
import { createMemoryRateLimiter } from '@/lib/auth/rateLimit';
import { isDbConfigured } from '@/server/db/client';
import { commitOrderStock, CommitInputError, normalizeLines } from '@/server/catalog/stock';
import { catalogChanged } from '@/server/catalog/public';
import { json, readJsonBody } from '@/server/http';

export const dynamic = 'force-dynamic';

// Freio contra abuso (baixa de estoque em massa): por instância do servidor.
const limiter = createMemoryRateLimiter(20, 10 * 60_000);

/**
 * Confirmação do pedido: valida e dá baixa no estoque de uma vez, no banco.
 * Responde 409 com os itens sem estoque (o checkout mostra a mesma mensagem de antes).
 */
export async function POST(request: Request) {
  if (!(await isSameOrigin())) return json({ error: 'Origem não permitida.' }, 403);
  if (!isDbConfigured()) return json({ ok: true, mode: 'local' });

  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || h.get('x-real-ip') || 'local';
  if (!limiter.check(`ip:${ip}`).allowed) return json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429);
  limiter.fail(`ip:${ip}`);

  try {
    const body = (await readJsonBody(request, 20_000)) as { orderId?: unknown; items?: unknown };
    const { orderId, lines } = normalizeLines(body.orderId, body.items);
    const result = await commitOrderStock(orderId, lines);
    if (!result.ok) return json({ ok: false, issues: result.issues }, 409);
    if (!result.repeated) catalogChanged();
    return json({ ok: true, mode: 'db' });
  } catch (err) {
    if (err instanceof CommitInputError || err instanceof SyntaxError) return json({ error: err instanceof CommitInputError ? err.message : 'Requisição inválida.' }, 400);
    console.error('[pedidos] falha ao confirmar estoque', err);
    return json({ error: 'Não foi possível confirmar o estoque agora. Tente novamente.' }, 503);
  }
}

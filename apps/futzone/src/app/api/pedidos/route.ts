import { headers } from 'next/headers';
import { isSameOrigin } from '@/lib/auth/session';
import { createMemoryRateLimiter } from '@/lib/auth/rateLimit';
import { isDbConfigured } from '@/server/db/client';
import { CommitInputError } from '@/server/catalog/stock';
import { catalogChanged } from '@/server/catalog/public';
import { createOrder, OrderInputError } from '@/server/orders/orders.service';
import { json, readJsonBody } from '@/server/http';

export const dynamic = 'force-dynamic';

// Freio contra abuso (pedidos em massa segurando estoque): por instância do servidor.
const limiter = createMemoryRateLimiter(20, 10 * 60_000);

/**
 * Registra o pedido no banco (time, tamanho e quantidade), dá baixa no estoque e
 * devolve o número e os pagamentos a fazer nos links da Stripe. Responde 409 com
 * os itens sem estoque ou com preço diferente do link.
 */
export async function POST(request: Request) {
  if (!(await isSameOrigin())) return json({ error: 'Origem não permitida.' }, 403);
  if (!isDbConfigured()) return json({ ok: true, mode: 'local' });

  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || h.get('x-real-ip') || 'local';
  if (!limiter.check(`ip:${ip}`).allowed) return json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429);
  limiter.fail(`ip:${ip}`);

  try {
    const body = (await readJsonBody(request, 20_000)) as { orderId?: unknown; customer?: unknown; items?: unknown };
    const result = await createOrder({ orderId: body.orderId, customer: body.customer, items: body.items });
    if (!result.ok) return json(result, 409);
    if (!result.repeated) catalogChanged();
    return json({ ok: true, mode: 'db', order: result.order });
  } catch (err) {
    if (err instanceof OrderInputError || err instanceof CommitInputError) return json({ error: err.message }, 400);
    if (err instanceof SyntaxError) return json({ error: 'Requisição inválida.' }, 400);
    console.error('[pedidos] falha ao registrar o pedido', err);
    return json({ error: 'Não foi possível registrar o pedido agora. Tente novamente.' }, 503);
  }
}

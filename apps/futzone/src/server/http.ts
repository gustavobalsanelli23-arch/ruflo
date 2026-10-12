import 'server-only';
import { isSameOrigin } from '@/lib/auth/session';
import { isDbConfigured } from '@/server/db/client';

/** Respostas JSON sem cache (rotas privadas). */
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const DB_MISSING =
  'Banco de dados não configurado. Crie o banco Neon em Vercel → Storage, conecte ao projeto e faça um novo deploy.';

/**
 * Verificações das rotas do painel, depois de `requireAdminApi()` (que cada rota
 * chama explicitamente): origem do próprio site em escritas e banco configurado.
 */
export async function adminChecks(opts: { write?: boolean; needsDb?: boolean } = {}): Promise<Response | null> {
  if (opts.write && !(await isSameOrigin())) return json({ error: 'Origem não permitida.' }, 403);
  if (opts.needsDb !== false && !isDbConfigured()) return json({ error: DB_MISSING }, 503);
  return null;
}

export async function readJsonBody(request: Request, maxBytes = 3_000_000): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('Requisição grande demais.');
  return JSON.parse(text);
}

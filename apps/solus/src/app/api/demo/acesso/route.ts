import { z } from 'zod';
import { jsonError, sameOrigin } from '@/services/ai-run';
import { allowDemoUnlock, checkDemoCode, demoAiEnabled, unlockDemoAi } from '@/services/demo-ai';

/** Unlocks the demonstration analyst in this browser with the access code. */

export const runtime = 'nodejs';

const bodySchema = z.object({ code: z.string().trim().min(1).max(200) });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, 'Origem não permitida.');
  if (!demoAiEnabled()) return jsonError(404, 'O analista de IA da demonstração está desativado.');
  if (!(await allowDemoUnlock())) return jsonError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  let code = '';
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (parsed.success) code = parsed.data.code;
  } catch {
    // corpo inválido: tratado como código errado
  }
  if (!code || !checkDemoCode(code)) return jsonError(403, 'Código de acesso incorreto.');
  await unlockDemoAi();
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}

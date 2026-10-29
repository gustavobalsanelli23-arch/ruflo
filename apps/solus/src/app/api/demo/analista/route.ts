import { z } from 'zod';
import { getAiConfig } from '@/lib/ai/config';
import { formatDate } from '@/lib/format';
import { PERIOD_OPTIONS, resolvePeriod } from '@/lib/period';
import { demoAnalystSource } from '@/demo/ai-source';
import { DEMO_TODAY } from '@/demo/catalog';
import { opportunities } from '@/demo/opportunities';
import { answerBlocks, jsonError, ndjson, runQuestion, sameOrigin } from '@/services/ai-run';
import { allowDemoQuestion, demoAiUnlocked } from '@/services/demo-ai';

/**
 * Analyst of the demonstration (fictitious data only). Off unless
 * SOLUS_DEMO_AI=on with an access code, unlocked per browser; limited per IP
 * and per day. Nothing is stored: the conversation lives in the browser.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const PERIODS = PERIOD_OPTIONS.map((option) => option.key) as [string, ...string[]];

const bodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('chat'),
    question: z.string().trim().min(1).max(2000),
    history: z.array(z.object({ question: z.string().max(2000), answer: z.string().max(4000) })).max(6),
    opportunityId: z.string().max(80).nullable(),
  }),
  z.object({ mode: z.literal('summary'), period: z.enum(PERIODS) }),
]);

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, 'Origem não permitida.');
  const config = getAiConfig();
  if (!config || !(await demoAiUnlocked())) return jsonError(403, 'O analista de IA da demonstração está desativado ou bloqueado.');
  if (!(await allowDemoQuestion())) return jsonError(429, 'Limite de perguntas da demonstração atingido. Tente mais tarde.');

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(400, 'Pergunta inválida.');
    body = parsed.data;
  } catch {
    return jsonError(400, 'Pergunta inválida.');
  }

  let question: string;
  let history: { question: string; answer: string }[] = [];
  if (body.mode === 'summary') {
    const period = resolvePeriod(body.period as (typeof PERIOD_OPTIONS)[number]['key'], DEMO_TODAY);
    const label = PERIOD_OPTIONS.find((option) => option.key === period.key)?.label.toLowerCase() ?? '';
    question = `Resumo executivo: ${label} (${formatDate(period.start)} a ${formatDate(period.end)}), período "${period.key}".`;
  } else if (body.opportunityId) {
    const opportunity = opportunities().find((item) => item.id === body.opportunityId);
    if (!opportunity) return jsonError(404, 'Oportunidade não encontrada.');
    question = `Explique a oportunidade "${opportunity.title}" (id ${opportunity.id}): por que ela apareceu, o que os dados mostram, o que é fato e o que é hipótese, e o que fazer.`;
  } else {
    question = body.question;
    history = body.history;
  }

  return ndjson(async (send) => {
    const run = await runQuestion(config, demoAnalystSource(), { question, history, mode: body.mode, today: DEMO_TODAY, signal: request.signal, onProgress: send });
    send({ type: 'answer', status: run.status, at: new Date().toISOString(), blocks: answerBlocks(run) });
  });
}

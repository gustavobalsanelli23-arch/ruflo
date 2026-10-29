import { z } from 'zod';
import { getAiConfig } from '@/lib/ai/config';
import { PERIOD_OPTIONS, resolvePeriod } from '@/lib/period';
import { beginAiRequest, createThread, finishAiRequest, saveAnswer, saveQuestion, saveSummary, summarySignature, tenantAnalystSource, threadContext } from '@/services/ai';
import { answerBlocks, jsonError, ndjson, runQuestion, sameOrigin } from '@/services/ai-run';
import { getCoverage } from '@/services/analytics';
import { todayInBrazil } from '@/services/imports';
import { lastAnalysisRun } from '@/services/opportunities';
import { authorize } from '@/services/workspace';
import { formatDate } from '@/lib/format';

/**
 * Analyst of a real organization. POST with a question (or a period, for the
 * Overview summary); the answer streams as NDJSON: progress steps, then the
 * answer. Session, role (analyst or above), active organization and usage
 * limits are checked here and again in the database.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const PERIODS = PERIOD_OPTIONS.map((option) => option.key) as [string, ...string[]];

const chatSchema = z.object({
  mode: z.literal('chat'),
  question: z.string().trim().min(1).max(2000),
  threadId: z.uuid().nullable(),
  opportunityId: z.uuid().nullable(),
});
const summarySchema = z.object({ mode: z.literal('summary'), period: z.enum(PERIODS) });
const bodySchema = z.discriminatedUnion('mode', [chatSchema, summarySchema]);

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, 'Origem não permitida.');
  const config = getAiConfig();
  if (!config) return jsonError(503, 'O analista de IA ainda não foi configurado neste servidor (ANTHROPIC_API_KEY).');
  const auth = await authorize('analyst');
  if (!auth.ok) return jsonError(auth.error.code === 'unauthenticated' ? 401 : 403, auth.error.message);

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(400, 'Pergunta inválida.');
    body = parsed.data;
  } catch {
    return jsonError(400, 'Pergunta inválida.');
  }

  const { supabase, workspace } = auth;
  const organizationId = workspace.active.organizationId;
  const source = tenantAnalystSource(supabase, organizationId, workspace.active.name);
  const today = todayInBrazil();

  if (body.mode === 'summary') {
    const coverage = await getCoverage(supabase, organizationId);
    if (!coverage.lastSale) return jsonError(409, 'Ainda não há vendas importadas para resumir.');
    const period = resolvePeriod(body.period as (typeof PERIOD_OPTIONS)[number]['key'], coverage.lastSale);
    const begun = await beginAiRequest(supabase, organizationId, 'summary');
    if (!begun.ok) return jsonError(begun.error.code === 'rate_limited' ? 429 : 403, begun.error.message);
    const lastRun = await lastAnalysisRun(supabase, organizationId);
    const signature = summarySignature(coverage, period.key, lastRun?.id ?? null);
    return ndjson(async (send) => {
      const label = PERIOD_OPTIONS.find((option) => option.key === period.key)?.label.toLowerCase() ?? '';
      const run = await runQuestion(config, source, {
        question: `Resumo executivo: ${label} (${formatDate(period.start)} a ${formatDate(period.end)}), período "${period.key}".`,
        history: [],
        mode: 'summary',
        today,
        signal: request.signal,
        onProgress: send,
      });
      const blocks = answerBlocks(run);
      if (run.answer) await saveSummary(supabase, organizationId, period.key, signature, blocks, run.models[0] ?? null);
      await finishAiRequest(supabase, begun.id, run);
      send({ type: 'answer', status: run.status, at: new Date().toISOString(), blocks });
    });
  }

  let question = body.question;
  if (body.opportunityId) {
    const { data } = await supabase.from('opportunities').select('id, title').eq('id', body.opportunityId).eq('organization_id', organizationId).maybeSingle();
    if (!data) return jsonError(404, 'Oportunidade não encontrada nesta organização.');
    question = `Explique a oportunidade "${data.title}" (id ${data.id}): por que ela apareceu, o que os dados mostram, o que é fato e o que é hipótese, e o que fazer.`;
  }

  let threadId: string | null = null;
  let history: { question: string; answer: string }[] = [];
  if (body.threadId) {
    const context = await threadContext(supabase, organizationId, body.threadId);
    if (!context) return jsonError(404, 'Conversa não encontrada.');
    threadId = context.id;
    history = context.history;
  }

  const begun = await beginAiRequest(supabase, organizationId, 'chat');
  if (!begun.ok) return jsonError(begun.error.code === 'rate_limited' ? 429 : 403, begun.error.message);

  threadId ??= await createThread(supabase, organizationId, body.opportunityId ? question.slice(0, 120) : body.question, body.opportunityId);
  if (!threadId || !(await saveQuestion(supabase, organizationId, threadId, body.opportunityId ? question : body.question))) {
    await finishAiRequest(supabase, begun.id, { status: 'failed', usage: { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, models: [] });
    return jsonError(500, 'Não foi possível registrar a pergunta. Tente de novo.');
  }
  const thread = threadId;

  return ndjson(async (send) => {
    send({ type: 'thread', id: thread });
    const run = await runQuestion(config, source, { question, history, mode: 'chat', today, signal: request.signal, onProgress: send });
    const blocks = answerBlocks(run);
    await saveAnswer(supabase, organizationId, thread, run, blocks);
    await finishAiRequest(supabase, begun.id, run);
    send({ type: 'answer', status: run.status, at: new Date().toISOString(), blocks });
  });
}

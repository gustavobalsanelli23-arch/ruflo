import 'server-only';
import type { RunResult } from '@/lib/ai/engine';
import type { AnalystDataSource, DateRange } from '@/lib/ai/types';
import type { Coverage } from '@/lib/analytics/mappers';
import type { AnalystMessage, AnalystThread, AnswerBlock, PeriodKey } from '@/lib/data/types';
import { logServerError } from '@/lib/log';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { mapDatabaseError, type MappedError } from '@/lib/supabase/errors';
import { z } from 'zod';
import type { SolusClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import { getAllInventory, getAllProducts, getCategories, getCoverage, getDaily, getInventoryTotals, getParameters, getSuppliers, getTotals } from './analytics';
import { listOpportunities } from './opportunities';

/**
 * Server side of the analyst for a real organization: the data source (the
 * SQL metric layer, read with the person's session so RLS applies),
 * conversations and usage accounting. Nothing here uses the secret key.
 */

const memo = <T>(fn: () => Promise<T>) => {
  let value: Promise<T> | null = null;
  return () => (value ??= fn());
};

export function tenantAnalystSource(supabase: SolusClient, organizationId: string, organizationName: string): AnalystDataSource {
  const coverage = memo(() => getCoverage(supabase, organizationId));
  const cache = new Map<string, Promise<unknown>>();
  const once = <T>(key: string, fn: () => Promise<T>) => {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key) as Promise<T>;
  };
  const key = (name: string, range: DateRange) => `${name}:${range.start}:${range.end}`;

  return {
    async context() {
      const c = await coverage();
      const notes: string[] = [];
      if (c.incompleteProducts > 0) notes.push(`${c.incompleteProducts} produtos vendidos ainda sem cadastro completo (sem categoria ou custo).`);
      return { environment: 'tenant', organization: organizationName, lastSale: c.lastSale, firstSale: c.firstSale, lastSnapshot: c.lastSnapshot, notes };
    },
    parameters: () => getParameters(supabase, organizationId),
    totals: (range) => once(key('totals', range), () => getTotals(supabase, organizationId, range)),
    daily: (range) =>
      once(key('daily', range), async () =>
        (await getDaily(supabase, organizationId, range)).map((day) => ({
          day: day.day,
          netRevenue: day.netRevenue,
          costedNetRevenue: day.costedNetRevenue,
          grossProfit: day.grossProfit,
          orders: day.orders,
        })),
      ),
    products: (range) => once(key('products', range), () => getAllProducts(supabase, organizationId, range)),
    groups: (kind, range) =>
      once(key(kind, range), async () =>
        (kind === 'supplier' ? await getSuppliers(supabase, organizationId, range) : await getCategories(supabase, organizationId, range)).map((group) => ({
          id: group.id,
          name: group.name,
          products: group.products,
          netRevenue: group.netRevenue,
          costedNetRevenue: group.costedNetRevenue,
          grossProfit: group.grossProfit,
          grossMargin: group.grossMargin,
          unitsSold: group.unitsSold,
        })),
      ),
    stock: () =>
      once('stock', async () => {
        const asOf = (await coverage()).lastSnapshot;
        if (!asOf) return null;
        const [positions, totals] = await Promise.all([getAllInventory(supabase, organizationId, asOf), getInventoryTotals(supabase, organizationId, asOf)]);
        return { asOf, stockValue: totals.stockValue, annualTurnover: totals.annualTurnover, positions };
      }),
    opportunities: () => once('opportunities', async () => (await listOpportunities(supabase, organizationId)).items),
  };
}

/* ---------- uso e limites ---------- */

export async function beginAiRequest(supabase: SolusClient, organizationId: string, kind: 'chat' | 'summary'): Promise<{ ok: true; id: string } | { ok: false; error: MappedError }> {
  const { data, error } = await supabase.rpc('begin_ai_request', { p_organization_id: organizationId, p_kind: kind });
  if (error || !data) {
    const mapped = mapDatabaseError(error);
    if (mapped.code === 'unknown') logServerError('ia: iniciar', error);
    return { ok: false, error: mapped };
  }
  return { ok: true, id: data };
}

export async function finishAiRequest(supabase: SolusClient, requestId: string, run: Pick<RunResult, 'status' | 'usage' | 'models'>) {
  const { error } = await supabase.rpc('finish_ai_request', {
    p_request_id: requestId,
    p_status: run.status,
    p_model: run.models.join(',').slice(0, 64) || null,
    p_requests: run.usage.requests,
    p_input_tokens: run.usage.inputTokens,
    p_output_tokens: run.usage.outputTokens,
    p_cache_read_tokens: run.usage.cacheReadTokens,
    p_cache_write_tokens: run.usage.cacheWriteTokens,
  });
  if (error) logServerError('ia: concluir', error);
}

/* ---------- conversas ---------- */

const THREADS = 30;

export async function listThreads(supabase: SolusClient, organizationId: string): Promise<AnalystThread[]> {
  const { data, error } = await supabase
    .from('analyst_threads')
    .select('id, title, updated_at')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(THREADS);
  if (error) {
    logServerError('ia: conversas', error);
    return [];
  }
  return data.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updated_at, messages: [] }));
}

const str = z.string().max(4000);
const items = z.array(str).max(50);
const answerBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('summary'), text: str }),
  z.object({
    kind: z.literal('metrics'),
    items: z.array(z.object({ label: str, value: str, delta: str.optional(), tone: z.enum(['positive', 'negative', 'neutral']).optional() })).max(50),
  }),
  z.object({
    kind: z.literal('chart'),
    title: str,
    unit: z.enum(['currency', 'percent']),
    points: z.array(z.object({ label: str, value: z.number().finite() })).max(500),
    layout: z.enum(['bars', 'line']).optional(),
  }),
  z.object({
    kind: z.literal('table'),
    title: str,
    columns: z.array(z.object({ key: str, label: str, align: z.enum(['left', 'right']).optional() })).max(20),
    rows: z.array(z.record(z.string(), str)).max(200),
    note: str.optional(),
  }),
  z.object({ kind: z.literal('findings'), facts: items, hypotheses: items }),
  z.object({ kind: z.literal('recommendation'), items }),
  z.object({ kind: z.literal('sources'), items: z.array(z.object({ name: str, detail: str })).max(50) }),
  z.object({ kind: z.literal('next'), items }),
  z.object({ kind: z.literal('notice'), tone: z.enum(['info', 'warning']), title: str, items }),
]);

/** Stored blocks are re-validated: a malformed one is dropped instead of breaking the page for every member. */
export function asBlocks(value: Json | null): AnswerBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((block) => {
    const parsed = answerBlockSchema.safeParse(block);
    return parsed.success ? [parsed.data as AnswerBlock] : [];
  });
}

export async function threadMessages(supabase: SolusClient, organizationId: string, threadId: string): Promise<AnalystMessage[] | null> {
  const { data: thread } = await supabase.from('analyst_threads').select('id').eq('id', threadId).eq('organization_id', organizationId).maybeSingle();
  if (!thread) return null;
  const { data, error } = await supabase
    .from('analyst_messages')
    .select('id, role, question, answer, failure, status, created_at')
    .eq('thread_id', threadId)
    .order('id', { ascending: true })
    .limit(200);
  if (error) {
    logServerError('ia: mensagens', error);
    return null;
  }
  return data.map((row) =>
    row.role === 'user'
      ? { id: `m${row.id}`, role: 'user', at: row.created_at, text: row.question ?? '' }
      : { id: `m${row.id}`, role: 'analyst', at: row.created_at, blocks: row.answer ? asBlocks(row.answer) : failureBlocks(row.failure) },
  );
}

export const failureBlocks = (failure: string | null): AnswerBlock[] => [
  { kind: 'notice', tone: 'warning', title: 'Sem resposta', items: [failure ?? 'O analista não conseguiu responder. Tente de novo.'] },
];

/** The thread, if it belongs to the person and organization, with the last exchanges for context. */
export async function threadContext(supabase: SolusClient, organizationId: string, threadId: string) {
  const { data: thread } = await supabase.from('analyst_threads').select('id').eq('id', threadId).eq('organization_id', organizationId).maybeSingle();
  if (!thread) return null;
  const { data } = await supabase
    .from('analyst_messages')
    .select('role, question, answer_text')
    .eq('thread_id', threadId)
    .order('id', { ascending: false })
    .limit(12);
  const rows = (data ?? []).reverse();
  const history: { question: string; answer: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const next = rows[i + 1];
    if (row.role === 'user' && next?.role === 'analyst' && next.answer_text) history.push({ question: row.question ?? '', answer: next.answer_text });
  }
  return { id: thread.id, history };
}

export async function createThread(supabase: SolusClient, organizationId: string, title: string, opportunityId: string | null) {
  const { data, error } = await supabase
    .from('analyst_threads')
    .insert({ organization_id: organizationId, title: title.slice(0, 200), opportunity_id: opportunityId })
    .select('id')
    .single();
  if (error || !data) {
    logServerError('ia: nova conversa', error);
    return null;
  }
  return data.id;
}

export async function saveQuestion(supabase: SolusClient, organizationId: string, threadId: string, question: string) {
  const { error } = await supabase.from('analyst_messages').insert({ organization_id: organizationId, thread_id: threadId, role: 'user', question });
  if (error) logServerError('ia: salvar pergunta', error);
  return !error;
}

export async function saveAnswer(supabase: SolusClient, organizationId: string, threadId: string, run: RunResult, blocks: AnswerBlock[]) {
  const { error } = await supabase.from('analyst_messages').insert({
    organization_id: organizationId,
    thread_id: threadId,
    role: 'analyst',
    answer: run.answer ? (blocks as unknown as Json) : null,
    answer_text: run.answer?.text.slice(0, 8000) ?? null,
    status: run.status,
    failure: run.failure?.slice(0, 500) ?? null,
    tool_calls: run.toolCalls as unknown as Json,
    grounding: { ...run.grounding, removed: run.answer?.removed ?? [], dropped: run.answer?.dropped ?? [] } as unknown as Json,
  });
  if (error) logServerError('ia: salvar resposta', error);
}

/* ---------- resumo da Visão geral ---------- */

export interface StoredSummary {
  blocks: AnswerBlock[];
  signature: string;
  createdAt: string;
}

/** Identifies the data a summary was written from: new imports or a new analysis make it stale. */
export function summarySignature(coverage: Coverage, period: PeriodKey, lastRunId: string | null) {
  return [period, coverage.lastImportAt ?? '-', coverage.lastSale ?? '-', coverage.lastSnapshot ?? '-', lastRunId ?? '-'].join('|');
}

export async function getSummary(supabase: SolusClient, organizationId: string, period: PeriodKey): Promise<StoredSummary | null> {
  const { data, error } = await supabase
    .from('ai_summaries')
    .select('content, data_signature, created_at')
    .eq('organization_id', organizationId)
    .eq('period_key', period)
    .maybeSingle();
  if (error) logServerError('ia: resumo', error);
  return data ? { blocks: asBlocks(data.content), signature: data.data_signature, createdAt: data.created_at } : null;
}

/**
 * Written with the secret key, after the server ran the model and checked the
 * numbers: users cannot call save_ai_summary themselves (it would let anyone
 * publish arbitrary text as the org-wide "Resumo da IA"). The database checks
 * again that `actorId` is an analyst or above in the organization.
 */
export async function saveSummary(actorId: string, organizationId: string, period: PeriodKey, signature: string, blocks: AnswerBlock[], model: string | null) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    logServerError('ia: salvar resumo', { code: 'missing_secret' });
    return false;
  }
  const { error } = await admin.rpc('save_ai_summary', {
    p_actor: actorId,
    p_organization_id: organizationId,
    p_period_key: period,
    p_data_signature: signature,
    p_content: blocks as unknown as Json,
    p_model: model,
  });
  if (error) logServerError('ia: salvar resumo', error);
  return !error;
}

import Anthropic from '@anthropic-ai/sdk';
import { resolveAnswer, checkDraft, type ResolvedAnswer } from './answer';
import { buildGround } from './grounding';
import { contextNote, SUMMARY_INSTRUCTION, SYSTEM_PROMPT } from './prompt';
import { answerSchema, progressLabel, RESPOND_TOOL, runDataTool, TOOL_DEFINITIONS } from './tools';
import type { AnalystDataSource, ProgressEvent, ToolOutput } from './types';

/**
 * The analyst loop: the model reads the data through the tools and answers
 * through "responder". The loop is bounded (steps and wall-clock time), every
 * tool input is validated, and the final text goes through the grounding
 * check with one chance to correct it.
 */

export interface MessagesClient {
  beta: {
    messages: {
      create(params: Anthropic.Beta.MessageCreateParamsNonStreaming, options?: { signal?: AbortSignal }): PromiseLike<Anthropic.Beta.BetaMessage>;
    };
  };
}

export interface EngineConfig {
  model: string;
  effort: 'low' | 'medium' | 'high';
  /** Model calls per answer, including the correction. */
  maxSteps: number;
  /** After this, the model is told to answer with what it already has. */
  softDeadlineMs: number;
  maxTokens: number;
}

export interface RunInput {
  question: string;
  /** Previous exchanges of the same conversation, oldest first. */
  history: { question: string; answer: string }[];
  mode: 'chat' | 'summary';
  today: string;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
}

export interface Usage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface RunResult {
  status: 'answered' | 'partial' | 'refused' | 'failed';
  answer: ResolvedAnswer | null;
  /** User-facing reason when there is no answer. */
  failure: string | null;
  toolCalls: { name: string; ref: string | null; ok: boolean }[];
  usage: Usage;
  models: string[];
  grounding: { corrected: boolean; unverified: string[] };
}

const MAX_HISTORY = 6;
const MAX_QUESTION = 2000;

function userTurn(input: RunInput, note: string): string {
  const history = input.history.slice(-MAX_HISTORY);
  const parts = [`<contexto>\n${note}\n</contexto>`];
  if (history.length > 0) {
    parts.push(
      `<conversa_anterior>\n${history.map((item) => `Pergunta: ${item.question}\nResposta: ${item.answer}`).join('\n\n')}\n</conversa_anterior>\nOs números da conversa anterior só podem ser repetidos se você consultá-los de novo.`,
    );
  }
  if (input.mode === 'summary') parts.push(SUMMARY_INSTRUCTION);
  parts.push(`<pergunta>\n${input.question.slice(0, MAX_QUESTION)}\n</pergunta>`);
  return parts.join('\n\n');
}

export async function runAnalyst(client: MessagesClient, config: EngineConfig, source: AnalystDataSource, input: RunInput, now: () => number = Date.now): Promise<RunResult> {
  const started = now();
  const context = await source.context();
  const usage: Usage = { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const models = new Set<string>();
  const toolCalls: RunResult['toolCalls'] = [];
  const outputs: ToolOutput[] = [];
  const groundValues: unknown[] = [[context.firstSale, context.lastSale, context.lastSnapshot, input.today].filter(Boolean)];
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: userTurn(input, contextNote(context, input.today)) }];
  let corrected = false;
  let lastUnverified: string[] = [];
  let nudged = false;
  let finalizing = false;
  let refs = 0;

  const result = (status: RunResult['status'], answer: ResolvedAnswer | null, failure: string | null): RunResult => ({
    status,
    answer,
    failure,
    toolCalls,
    usage,
    models: [...models],
    grounding: { corrected, unverified: lastUnverified },
  });

  for (let step = 0; step < config.maxSteps; step++) {
    if (!finalizing && (now() - started > config.softDeadlineMs || step === config.maxSteps - 1)) {
      finalizing = true;
      messages.push({ role: 'system', content: 'Limite de tempo da análise: não faça novas consultas. Chame agora a ferramenta "responder" com os dados já consultados.' });
    }

    const response = await client.beta.messages.create(
      {
        model: config.model,
        max_tokens: config.maxTokens,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: TOOL_DEFINITIONS,
        messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: config.effort },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { signal: input.signal },
    );
    usage.requests += 1;
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;
    usage.cacheReadTokens += response.usage.cache_read_input_tokens ?? 0;
    usage.cacheWriteTokens += response.usage.cache_creation_input_tokens ?? 0;
    models.add(response.model);

    if (response.stop_reason === 'refusal') {
      return result('refused', null, 'O modelo recusou esta pergunta. Reformule com foco nos dados da empresa.');
    }
    if (response.stop_reason === 'max_tokens') {
      return result('failed', null, 'A resposta ficou longa demais. Faça uma pergunta mais específica.');
    }

    const uses = response.content.filter((block): block is Anthropic.Beta.BetaToolUseBlock => block.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });

    if (uses.length === 0) {
      if (nudged) return result('failed', null, 'O analista não conseguiu montar a resposta. Tente de novo.');
      nudged = true;
      messages.push({ role: 'user', content: 'Entregue a resposta chamando a ferramenta "responder".' });
      continue;
    }

    const respond = uses.filter((use) => use.name === RESPOND_TOOL);
    const data = uses.filter((use) => use.name !== RESPOND_TOOL);
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];

    const executed = await Promise.all(
      data.map(async (use) => {
        input.onProgress?.({ type: 'step', label: progressLabel(use.name) });
        const ref = finalizing ? null : `R${++refs}`;
        if (!ref) return { use, ref, output: { error: 'Limite de tempo: não há mais consultas nesta resposta. Responda com os dados já consultados.' } };
        return { use, ref, output: await runDataTool(use.name, use.input, ref, source, context) };
      }),
    );
    for (const { use, ref, output } of executed) {
      const ok = !('error' in output);
      toolCalls.push({ name: use.name, ref: ok ? ref : null, ok });
      if ('error' in output) {
        results.push({ type: 'tool_result', tool_use_id: use.id, is_error: true, content: output.error });
      } else {
        outputs.push(output);
        groundValues.push(output.data);
        results.push({ type: 'tool_result', tool_use_id: use.id, content: JSON.stringify(output.data) });
      }
    }

    if (respond.length > 0) {
      if (data.length > 0 || respond.length > 1) {
        for (const use of respond) {
          results.push({ type: 'tool_result', tool_use_id: use.id, is_error: true, content: 'Chame "responder" uma única vez, sozinha, depois de receber os resultados das consultas.' });
        }
      } else {
        const use = respond[0]!;
        const parsed = answerSchema.safeParse(use.input);
        if (!parsed.success) {
          if (corrected) return result('failed', null, 'O analista não conseguiu montar a resposta no formato esperado. Tente de novo.');
          corrected = true;
          results.push({
            type: 'tool_result',
            tool_use_id: use.id,
            is_error: true,
            content: `Resposta fora do formato: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}. Corrija e chame "responder" de novo.`,
          });
        } else {
          const ground = buildGround(groundValues);
          lastUnverified = checkDraft(parsed.data, ground);
          if (lastUnverified.length === 0 || corrected) {
            const answer = resolveAnswer(parsed.data, outputs, ground, true);
            return result(answer.removed.length > 0 ? 'partial' : 'answered', answer, null);
          }
          corrected = true;
          input.onProgress?.({ type: 'step', label: 'Conferindo os números com os dados' });
          results.push({
            type: 'tool_result',
            tool_use_id: use.id,
            is_error: true,
            content: `Estes números ou datas não aparecem nos resultados das consultas: ${lastUnverified.join(', ')}. Use só valores das consultas, copiados como vieram, ou consulte de novo. Depois chame "responder" outra vez.`,
          });
        }
      }
    }

    messages.push({ role: 'user', content: results });
  }
  return result('failed', null, 'A análise passou do limite de etapas. Faça uma pergunta mais específica.');
}

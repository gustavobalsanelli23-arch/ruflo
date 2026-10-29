import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { getAiClient } from '@/lib/ai/config';
import { runAnalyst, type EngineConfig, type RunInput, type RunResult } from '@/lib/ai/engine';
import type { AnalystDataSource } from '@/lib/ai/types';
import type { AnswerBlock } from '@/lib/data/types';
import { logServerError } from '@/lib/log';
import { AnalyticsError } from './analytics';

/**
 * Runs one analyst answer and turns every failure into a message a person
 * can act on (details stay in the server log, without content).
 */

const EMPTY_USAGE: RunResult['usage'] = { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

function failed(message: string): RunResult {
  return { status: 'failed', answer: null, failure: message, toolCalls: [], usage: EMPTY_USAGE, models: [], grounding: { corrected: false, unverified: [] } };
}

export function friendlyFailure(error: unknown): string {
  if (error instanceof AnalyticsError) return 'Não foi possível ler os dados da organização agora. Tente de novo em instantes.';
  if (error instanceof Anthropic.RateLimitError) return 'O serviço de IA está com muitas solicitações. Tente de novo em instantes.';
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return 'O analista de IA está indisponível por um problema de configuração do servidor.';
  }
  if (error instanceof Anthropic.APIConnectionError) return 'O serviço de IA não respondeu a tempo. Tente de novo.';
  if (error instanceof Anthropic.InternalServerError) return 'O serviço de IA está instável no momento. Tente de novo em instantes.';
  return 'O analista não conseguiu responder agora. Tente de novo.';
}

export async function runQuestion(config: EngineConfig, source: AnalystDataSource, input: RunInput): Promise<RunResult> {
  try {
    return await runAnalyst(getAiClient(), config, source, input);
  } catch (error) {
    if (input.signal?.aborted) return failed('A pergunta foi interrompida.');
    logServerError('ia: análise', error);
    return failed(friendlyFailure(error));
  }
}

export function answerBlocks(run: RunResult): AnswerBlock[] {
  if (run.answer) return run.answer.blocks;
  return [{ kind: 'notice', tone: 'warning', title: 'Sem resposta', items: [run.failure ?? 'O analista não conseguiu responder. Tente de novo.'] }];
}

/* ---------- transporte: NDJSON ---------- */

export type StreamEvent =
  | { type: 'thread'; id: string }
  | { type: 'step'; label: string }
  | { type: 'answer'; status: RunResult['status']; at: string; blocks: AnswerBlock[] }
  | { type: 'error'; message: string };

/** A streamed response: each event is one JSON line. */
export function ndjson(work: (send: (event: StreamEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // o cliente desconectou
        }
      };
      try {
        await work(send);
      } catch (error) {
        logServerError('ia: transmissão', error);
        send({ type: 'error', message: 'O analista não conseguiu responder agora. Tente de novo.' });
      } finally {
        try {
          controller.close();
        } catch {
          // já fechado
        }
      }
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

export function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } });
}

/** Same-origin check for POST routes (Server Actions get this from Next.js; route handlers do not). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

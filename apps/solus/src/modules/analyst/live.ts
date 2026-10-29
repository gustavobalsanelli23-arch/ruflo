import type { AnalystThread, AnswerBlock } from '@/lib/data/types';
import { answerToText } from './answer-blocks';

/**
 * Browser side of the live analyst: POSTs the question and reads the
 * NDJSON stream (progress steps, then the answer). Errors become an answer
 * with a notice, so the conversation always shows what happened.
 */

export type LiveEvent =
  | { type: 'thread'; id: string }
  | { type: 'step'; label: string }
  | { type: 'answer'; status: 'answered' | 'partial' | 'refused' | 'failed'; at: string; blocks: AnswerBlock[] }
  | { type: 'error'; message: string };

export const noticeBlocks = (message: string): AnswerBlock[] => [{ kind: 'notice', tone: 'warning', title: 'Sem resposta', items: [message] }];

export async function streamAnswer(endpoint: string, body: unknown, onEvent: (event: LiveEvent) => void, signal?: AbortSignal): Promise<void> {
  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
  } catch {
    if (signal?.aborted) return;
    onEvent({ type: 'error', message: 'Sem conexão com o servidor. Confira a internet e tente de novo.' });
    return;
  }
  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    onEvent({ type: 'error', message: payload?.error ?? 'O analista não conseguiu responder agora. Tente de novo.' });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answered = false;
  const handle = (line: string) => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line) as LiveEvent;
      if (event.type === 'answer' || event.type === 'error') answered = true;
      onEvent(event);
    } catch {
      // linha incompleta ou corrompida: ignorada
    }
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(handle);
    }
    handle(buffer + decoder.decode());
  } catch {
    if (signal?.aborted) return;
  }
  if (!answered) onEvent({ type: 'error', message: 'A conexão caiu antes da resposta. Tente de novo.' });
}

/** Previous exchanges of a conversation as text, for the demo (which stores nothing on the server). */
export function historyOf(thread: AnalystThread | null): { question: string; answer: string }[] {
  if (!thread) return [];
  const pairs: { question: string; answer: string }[] = [];
  thread.messages.forEach((message, index) => {
    const next = thread.messages[index + 1];
    if (message.role === 'user' && next?.role === 'analyst' && next.blocks) {
      pairs.push({ question: (message.text ?? '').slice(0, 2000), answer: answerToText(next.blocks).slice(0, 4000) });
    }
  });
  return pairs.slice(-6);
}

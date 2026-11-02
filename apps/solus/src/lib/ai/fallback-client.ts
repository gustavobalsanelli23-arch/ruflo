import type { MessagesClient } from './engine';
import { OpenAICompatConnectionError, OpenAICompatError } from './openai-client';

/**
 * Rotates between several providers (Groq, OpenRouter, Gemini, Cerebras…),
 * typically on free plans with small limits. Each call goes to the first
 * provider in the list that is not resting; when one answers "limit reached"
 * (429), has no credit (402), rejects the key or the model, or is down, the
 * same call goes to the next one, and the failed provider rests for a while
 * (the time it asked for in Retry-After, when it said).
 *
 * The analyst resends the whole conversation on every call, so changing
 * provider in the middle of an answer is safe.
 *
 * Rest times live in the memory of the server instance: a new instance
 * starts with every provider available, and at worst tries a resting one
 * again (it answers 429 at once and the call moves on).
 */

export interface ProviderSlot {
  /** Short label for logs, e.g. "groq/llama-3.3-70b". Never the key. */
  name: string;
  client: MessagesClient;
  model: string;
  /** Output limit of this provider; null keeps what the engine asked for. */
  maxTokens: number | null;
}

export interface FallbackOptions {
  now?: () => number;
  /** Called when a provider fails and the call moves on (or gives up). */
  onFailure?: (event: { provider: string; status: number | null; reason: string | null; restMs: number; next: string | null }) => void;
}

const MINUTE = 60_000;
/** Rest when the provider does not say how long. */
const REST = {
  rateLimit: MINUTE,
  unavailable: 30_000,
  /** no credit, bad key, model removed: needs a person, so check again only after an hour */
  configuration: 60 * MINUTE,
} as const;

/** How long a provider rests after this error; 0 = only skip it for this call. */
export function restFor(error: unknown): number {
  if (error instanceof OpenAICompatConnectionError) return REST.unavailable;
  if (!(error instanceof OpenAICompatError)) return 0;
  const { status, retryAfterMs } = error;
  if (status === 429) return retryAfterMs ?? REST.rateLimit;
  if (status === 401 || status === 402 || status === 403 || status === 404) return REST.configuration;
  if (status === 408 || status === 409 || status >= 500) return retryAfterMs ?? REST.unavailable;
  // 400, 413, 422: este pedido não serviu para este provedor (contexto grande, chamada de
  // ferramenta malformada…); o próximo tenta, sem castigar este.
  return 0;
}

const MAX_REASON_LENGTH = 200;
/** Long unbroken runs look like credentials: providers may echo part of a rejected key. */
const SECRET_LIKE = /[A-Za-z0-9_-]{32,}/g;

/** The provider's own explanation, safe for the server log; null for unknown errors. */
export function failureReason(error: unknown): string | null {
  if (!(error instanceof OpenAICompatError || error instanceof OpenAICompatConnectionError)) return null;
  return error.message.replace(SECRET_LIKE, '[oculto]').replace(/\s+/g, ' ').trim().slice(0, MAX_REASON_LENGTH) || null;
}

/** Error to show when every provider failed: "limit reached" wins, since it explains the most. */
function pickError(errors: unknown[]): unknown {
  return errors.find((error) => error instanceof OpenAICompatError && error.status === 429) ?? errors.at(-1);
}

export function createFallbackClient(slots: ProviderSlot[], options: FallbackOptions = {}): MessagesClient {
  if (slots.length === 0) throw new Error('solus: nenhum provedor de IA configurado');
  const now = options.now ?? Date.now;
  const restingUntil = new Map<number, number>();

  /** Available providers in priority order, then the resting ones, the one that wakes up first first. */
  function order(): number[] {
    const at = now();
    const indexes = slots.map((_, index) => index);
    const ready = indexes.filter((index) => (restingUntil.get(index) ?? 0) <= at);
    const resting = indexes.filter((index) => (restingUntil.get(index) ?? 0) > at).sort((a, b) => restingUntil.get(a)! - restingUntil.get(b)!);
    return [...ready, ...resting];
  }

  return {
    beta: {
      messages: {
        async create(params, requestOptions) {
          const errors: unknown[] = [];
          const queue = order();
          for (let position = 0; position < queue.length; position++) {
            const index = queue[position]!;
            const slot = slots[index]!;
            try {
              const message = await slot.client.beta.messages.create(
                { ...params, model: slot.model, max_tokens: slot.maxTokens ? Math.min(slot.maxTokens, params.max_tokens) : params.max_tokens },
                requestOptions,
              );
              restingUntil.delete(index);
              return message;
            } catch (error) {
              if (requestOptions?.signal?.aborted) throw error;
              const rest = restFor(error);
              if (rest > 0) restingUntil.set(index, now() + rest);
              errors.push(error);
              const next = queue[position + 1];
              options.onFailure?.({
                provider: slot.name,
                status: error instanceof OpenAICompatError ? error.status : null,
                reason: failureReason(error),
                restMs: rest,
                next: next === undefined ? null : slots[next]!.name,
              });
            }
          }
          throw pickError(errors);
        },
      },
    },
  };
}

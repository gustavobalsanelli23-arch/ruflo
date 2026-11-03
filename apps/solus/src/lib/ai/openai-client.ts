import type Anthropic from '@anthropic-ai/sdk';
import type { MessagesClient } from './engine';

/**
 * Adapter for any OpenAI-compatible Chat Completions API (DeepSeek, OpenRouter,
 * Groq, a local Ollama, OpenAI itself…). It implements the same
 * `MessagesClient` the engine uses for Claude: the request built in the
 * Anthropic format is translated to `POST {baseUrl}/chat/completions`, and the
 * reply is translated back, so the engine, the tools and the grounding check
 * stay exactly the same.
 *
 * What does not exist in Chat Completions is dropped: adaptive thinking,
 * effort, server-side fallback and prompt-cache markers. Mid-conversation
 * system notes become user messages (not every provider accepts a system
 * message after the first one).
 *
 * No SDK: plain `fetch`, with a timeout per call and retries on 429/5xx.
 */

type Params = Anthropic.Beta.MessageCreateParamsNonStreaming;
type Message = Anthropic.Beta.BetaMessage;

export interface OpenAICompatOptions {
  apiKey: string;
  /** Base URL up to the version, e.g. https://api.deepseek.com or https://openrouter.ai/api/v1. */
  baseUrl: string;
  /** Send `strict: true` in the function definitions (only for providers that support it). */
  strictTools?: boolean;
  /** Extra headers (OpenRouter accepts HTTP-Referer and X-Title). */
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
  /** Waits between retries; replaceable in tests. */
  sleep?: (ms: number) => Promise<void>;
}

/** HTTP or provider error, with the status used to pick the message shown to the person. */
export class OpenAICompatError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** How long the provider asked to wait (Retry-After), when it said. */
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'OpenAICompatError';
  }
}

/** Retry-After in seconds or as an HTTP date; null when absent or invalid. Capped at 24 h. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  if (!value?.trim()) return null;
  const seconds = Number(value);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.min(ms, 24 * 60 * 60 * 1000);
}

/** The provider did not answer (network failure or timeout). */
export class OpenAICompatConnectionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OpenAICompatConnectionError';
  }
}

/* ---------- formato Chat Completions ---------- */

interface ChatToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ChatToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface ChatResponse {
  id?: string;
  model?: string;
  choices?: {
    finish_reason?: string | null;
    message?: { content?: string | null; refusal?: string | null; tool_calls?: Partial<ChatToolCall>[] | null };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    /** DeepSeek */
    prompt_cache_hit_tokens?: number;
    /** OpenAI e OpenRouter */
    prompt_tokens_details?: { cached_tokens?: number } | null;
  };
  error?: { message?: string; code?: number | string } | string;
}

/* ---------- pedido: Anthropic → Chat Completions ---------- */

type Block = { type: string; [key: string]: unknown };

function textOf(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return (content as Block[])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string)
    .join('\n');
}

const SYSTEM_NOTE = (text: string) => `[Instrução do sistema]\n${text}`;

export function toChatMessages(params: Params): ChatMessage[] {
  const out: ChatMessage[] = [];
  const system = textOf(params.system);
  if (system) out.push({ role: 'system', content: system });

  for (const message of params.messages as { role: string; content: unknown }[]) {
    if (message.role === 'system') {
      out.push({ role: 'user', content: SYSTEM_NOTE(textOf(message.content)) });
      continue;
    }

    if (message.role === 'assistant') {
      const blocks: Block[] = typeof message.content === 'string' ? [{ type: 'text', text: message.content }] : ((message.content as Block[]) ?? []);
      const text = textOf(blocks);
      const calls: ChatToolCall[] = blocks
        .filter((block) => block.type === 'tool_use')
        .map((block) => ({ id: String(block.id), type: 'function', function: { name: String(block.name), arguments: JSON.stringify(block.input ?? {}) } }));
      out.push(calls.length > 0 ? { role: 'assistant', content: text || null, tool_calls: calls } : { role: 'assistant', content: text });
      continue;
    }

    // user
    if (typeof message.content === 'string') {
      out.push({ role: 'user', content: message.content });
      continue;
    }
    const blocks = (message.content as Block[]) ?? [];
    // Os resultados das ferramentas vêm logo depois da mensagem do assistente que as chamou.
    for (const block of blocks) {
      if (block.type !== 'tool_result') continue;
      const content = textOf(block.content);
      out.push({ role: 'tool', tool_call_id: String(block.tool_use_id), content: block.is_error ? `ERRO: ${content}` : content });
    }
    const text = textOf(blocks);
    if (text) out.push({ role: 'user', content: text });
  }
  return out;
}

type JsonSchema = { properties?: Record<string, { anyOf?: { type?: string }[] }>; required?: string[] };

/**
 * Providers such as Groq reject a whole call when the model leaves out a
 * required argument. A nullable argument can safely be left out, since the
 * tool reads a missing one as null, so it stops being required.
 */
function withOptionalNullables(schema: unknown): unknown {
  const { properties, required } = schema as JsonSchema;
  if (!properties || !required) return schema;
  const acceptsNull = (name: string) => properties[name]?.anyOf?.some((option) => option.type === 'null') ?? false;
  return { ...(schema as object), required: required.filter((name) => !acceptsNull(name)) };
}

export function toChatTools(params: Params, strict: boolean) {
  return ((params.tools ?? []) as { name: string; description?: string; input_schema: unknown }[]).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      parameters: strict ? tool.input_schema : withOptionalNullables(tool.input_schema),
      ...(strict ? { strict: true } : {}),
    },
  }));
}

/* ---------- resposta: Chat Completions → Anthropic ---------- */

function parseArguments(raw: string | undefined): unknown {
  if (!raw?.trim()) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : { argumentos_invalidos: raw.slice(0, 500) };
  } catch {
    // Vai falhar na validação da ferramenta, e o modelo recebe o erro para corrigir.
    return { argumentos_invalidos: raw.slice(0, 500) };
  }
}

export function fromChatResponse(body: ChatResponse, requestedModel: string): Message {
  const choice = body.choices?.[0];
  if (!choice) throw new OpenAICompatError(502, 'Resposta do provedor de IA sem "choices".');
  const message = choice.message ?? {};
  const content: Block[] = [];
  if (message.content?.trim()) content.push({ type: 'text', text: message.content, citations: null });
  (message.tool_calls ?? []).forEach((call, index) => {
    if (!call.function?.name) return;
    content.push({ type: 'tool_use', id: call.id || `call_${index + 1}`, name: call.function.name, input: parseArguments(call.function.arguments) });
  });

  const hasTools = content.some((block) => block.type === 'tool_use');
  let stop: Message['stop_reason'];
  if (message.refusal || choice.finish_reason === 'content_filter') stop = 'refusal';
  else if (choice.finish_reason === 'length') stop = 'max_tokens';
  else if (hasTools) stop = 'tool_use';
  else stop = 'end_turn';

  const prompt = body.usage?.prompt_tokens ?? 0;
  const cached = body.usage?.prompt_cache_hit_tokens ?? body.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    id: body.id ?? 'chatcmpl',
    type: 'message',
    role: 'assistant',
    model: body.model || requestedModel,
    content,
    stop_reason: stop,
    stop_sequence: null,
    usage: {
      // Como na Anthropic: input_tokens não inclui o que veio do cache.
      input_tokens: Math.max(0, prompt - cached),
      output_tokens: body.usage?.completion_tokens ?? 0,
      cache_read_input_tokens: cached,
      cache_creation_input_tokens: 0,
    },
  } as unknown as Message;
}

/* ---------- transporte ---------- */

const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

function errorMessage(body: ChatResponse | null, fallback: string): string {
  if (!body?.error) return fallback;
  return typeof body.error === 'string' ? body.error : (body.error.message ?? fallback);
}

export function createOpenAICompatClient(options: OpenAICompatOptions): MessagesClient {
  const url = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = options.timeoutMs ?? 45_000;
  const maxRetries = options.maxRetries ?? 2;

  async function call(payload: string, signal: AbortSignal | undefined, model: string): Promise<Message> {
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${options.apiKey}`, ...options.headers },
        body: payload,
        signal: combined,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new OpenAICompatConnectionError(timeout.aborted ? 'O provedor de IA não respondeu a tempo.' : 'Falha de conexão com o provedor de IA.', { cause: error });
    }

    let body: ChatResponse | null = null;
    try {
      body = (await response.json()) as ChatResponse;
    } catch {
      body = null;
    }
    if (!response.ok) {
      throw new OpenAICompatError(response.status, errorMessage(body, `HTTP ${response.status}`), parseRetryAfter(response.headers.get('retry-after')));
    }
    // Alguns provedores (OpenRouter) devolvem 200 com { error } quando o modelo de destino falha.
    if (!body || body.error) {
      const code = body && typeof body.error === 'object' ? Number(body.error.code) : NaN;
      throw new OpenAICompatError(Number.isInteger(code) && code >= 400 ? code : 502, errorMessage(body, 'Resposta inválida do provedor de IA.'));
    }
    return fromChatResponse(body, model);
  }

  return {
    beta: {
      messages: {
        async create(params, requestOptions) {
          const tools = toChatTools(params, options.strictTools ?? false);
          const payload = JSON.stringify({
            model: params.model,
            max_tokens: params.max_tokens,
            messages: toChatMessages(params),
            ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
            stream: false,
          });
          for (let attempt = 0; ; attempt++) {
            try {
              return await call(payload, requestOptions?.signal, params.model);
            } catch (error) {
              const retryable = error instanceof OpenAICompatConnectionError || (error instanceof OpenAICompatError && RETRYABLE.has(error.status));
              if (!retryable || attempt >= maxRetries || requestOptions?.signal?.aborted) throw error;
              await sleep(500 * 2 ** attempt);
            }
          }
        },
      },
    },
  };
}

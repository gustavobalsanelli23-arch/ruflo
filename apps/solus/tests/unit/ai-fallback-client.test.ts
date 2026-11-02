// @vitest-environment node
import type Anthropic from '@anthropic-ai/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MessagesClient } from '@/lib/ai/engine';
import { createFallbackClient, restFor, type ProviderSlot } from '@/lib/ai/fallback-client';
import { createOpenAICompatClient, OpenAICompatConnectionError, OpenAICompatError, parseRetryAfter } from '@/lib/ai/openai-client';
import { getAiConfig, getAiProvider, getProviderSlots } from '@/lib/ai/config';

/**
 * Rotation between providers: order, rest after a limit, Retry-After,
 * per-slot model and output limit, and the environment that builds the list.
 */

type Params = Anthropic.Beta.MessageCreateParamsNonStreaming;

const params: Params = { model: 'pedido', max_tokens: 8000, messages: [{ role: 'user', content: 'Oi' }] };
const reply = (model: string) => ({ id: 'm', type: 'message', role: 'assistant', model, content: [], stop_reason: 'end_turn' }) as unknown as Anthropic.Beta.BetaMessage;

/** A provider that runs a script of outcomes, one per call; the last one repeats. */
function provider(name: string, outcomes: (Error | 'ok')[], maxTokens: number | null = null) {
  const calls: Params[] = [];
  const client: MessagesClient = {
    beta: {
      messages: {
        create: vi.fn(async (request: Params) => {
          calls.push(request);
          const outcome = outcomes[Math.min(calls.length - 1, outcomes.length - 1)]!;
          if (outcome !== 'ok') throw outcome;
          return reply(request.model);
        }),
      },
    },
  };
  const slot: ProviderSlot = { name, client, model: `${name}-modelo`, maxTokens };
  return { slot, calls };
}

const limit = (retryAfterMs: number | null = null) => new OpenAICompatError(429, 'limite', retryAfterMs);

describe('rodízio', () => {
  it('usa o primeiro provedor enquanto ele responde, com o modelo dele', async () => {
    const a = provider('a', ['ok']);
    const b = provider('b', ['ok']);
    const client = createFallbackClient([a.slot, b.slot]);
    const message = await client.beta.messages.create(params);
    expect(message.model).toBe('a-modelo');
    expect(a.calls).toHaveLength(1);
    expect(b.calls).toHaveLength(0);
  });

  it('quando o limite acaba, passa para o próximo na mesma chamada e deixa o primeiro descansando', async () => {
    let clock = 0;
    const a = provider('a', [limit(), 'ok']);
    const b = provider('b', ['ok']);
    const failures: unknown[] = [];
    const client = createFallbackClient([a.slot, b.slot], { now: () => clock, onFailure: (event) => failures.push(event) });

    expect((await client.beta.messages.create(params)).model).toBe('b-modelo');
    expect(failures).toEqual([{ provider: 'a', status: 429, restMs: 60_000, next: 'b' }]);

    // durante o descanso, nem tenta o primeiro
    clock = 30_000;
    expect((await client.beta.messages.create(params)).model).toBe('b-modelo');
    expect(a.calls).toHaveLength(1);

    // depois do descanso, volta para o preferido
    clock = 60_001;
    expect((await client.beta.messages.create(params)).model).toBe('a-modelo');
  });

  it('respeita o Retry-After informado pelo provedor', async () => {
    let clock = 0;
    const a = provider('a', [limit(5 * 60_000), 'ok']);
    const b = provider('b', ['ok']);
    const client = createFallbackClient([a.slot, b.slot], { now: () => clock });
    await client.beta.messages.create(params);
    clock = 4 * 60_000;
    expect((await client.beta.messages.create(params)).model).toBe('b-modelo');
    clock = 5 * 60_000 + 1;
    expect((await client.beta.messages.create(params)).model).toBe('a-modelo');
  });

  it('com todos descansando, tenta primeiro o que acorda antes, e devolve o erro de limite se todos falharem', async () => {
    let clock = 0;
    const a = provider('a', [limit(10 * 60_000)]);
    const b = provider('b', [limit(60_000)]);
    const client = createFallbackClient([a.slot, b.slot], { now: () => clock });
    await expect(client.beta.messages.create(params)).rejects.toMatchObject({ status: 429 });

    clock = 1000;
    const order: string[] = [];
    (a.slot.client.beta.messages.create as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      order.push('a');
      throw limit();
    });
    (b.slot.client.beta.messages.create as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      order.push('b');
      return reply('b-modelo');
    });
    expect((await client.beta.messages.create(params)).model).toBe('b-modelo');
    expect(order).toEqual(['b']);
  });

  it('erro do pedido (400) pula o provedor só nesta chamada', async () => {
    let clock = 0;
    const a = provider('a', [new OpenAICompatError(400, 'tool_use_failed'), 'ok']);
    const b = provider('b', ['ok']);
    const client = createFallbackClient([a.slot, b.slot], { now: () => clock });
    expect((await client.beta.messages.create(params)).model).toBe('b-modelo');
    clock = 1;
    expect((await client.beta.messages.create(params)).model).toBe('a-modelo');
  });

  it('aplica o limite de saída de cada provedor', async () => {
    const a = provider('a', ['ok'], 4000);
    const client = createFallbackClient([a.slot]);
    await client.beta.messages.create(params);
    expect(a.calls[0]).toMatchObject({ model: 'a-modelo', max_tokens: 4000 });
  });

  it('cancelamento não passa para o próximo', async () => {
    const controller = new AbortController();
    const abort = new DOMException('aborted', 'AbortError');
    const a = provider('a', [abort]);
    const b = provider('b', ['ok']);
    const client = createFallbackClient([a.slot, b.slot]);
    controller.abort();
    await expect(client.beta.messages.create(params, { signal: controller.signal })).rejects.toBe(abort);
    expect(b.calls).toHaveLength(0);
  });

  it('descanso por tipo de erro', () => {
    expect(restFor(limit())).toBe(60_000);
    expect(restFor(limit(1234))).toBe(1234);
    expect(restFor(new OpenAICompatError(402, 'sem saldo'))).toBe(3_600_000);
    expect(restFor(new OpenAICompatError(404, 'modelo removido'))).toBe(3_600_000);
    expect(restFor(new OpenAICompatError(503, 'fora'))).toBe(30_000);
    expect(restFor(new OpenAICompatConnectionError('rede'))).toBe(30_000);
    expect(restFor(new OpenAICompatError(413, 'grande'))).toBe(0);
  });

  it('lê o Retry-After em segundos ou data', () => {
    expect(parseRetryAfter('7')).toBe(7000);
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:01:00 GMT', Date.parse('Thu, 01 Jan 2026 00:00:00 GMT'))).toBe(60_000);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('depois')).toBeNull();
    expect(parseRetryAfter('999999')).toBe(86_400_000);
  });

  it('o erro 429 do HTTP chega ao rodízio com o Retry-After', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Rate limit reached' } }), { status: 429, headers: { 'retry-after': '12' } }));
    const http = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://x.test', fetch: fetchMock, maxRetries: 0 });
    await expect(Promise.resolve(http.beta.messages.create(params))).rejects.toMatchObject({ status: 429, retryAfterMs: 12_000 });
  });
});

describe('lista de provedores no ambiente', () => {
  afterEach(() => vi.unstubAllEnvs());

  const NAMES = ['PROVIDER', 'API_KEY', 'BASE_URL', 'MODEL', 'MAX_TOKENS', 'NAME'];
  const stub = (values: Record<string, string>) => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    for (const field of NAMES) vi.stubEnv(`SOLUS_AI_${field}`, '');
    for (let n = 1; n <= 9; n++) for (const field of NAMES) vi.stubEnv(`SOLUS_AI_${n}_${field}`, '');
    for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  };

  it('Groq, outro modelo da Groq com a mesma chave, OpenRouter e Gemini, em ordem', () => {
    stub({
      SOLUS_AI_1_API_KEY: 'gsk',
      SOLUS_AI_1_BASE_URL: 'https://api.groq.com/openai/v1',
      SOLUS_AI_1_MODEL: 'modelo-grande',
      SOLUS_AI_2_MODEL: 'modelo-menor',
      SOLUS_AI_3_API_KEY: 'sk-or',
      SOLUS_AI_3_BASE_URL: 'https://openrouter.ai/api/v1',
      SOLUS_AI_3_MODEL: 'deepseek/algum:free',
      SOLUS_AI_3_MAX_TOKENS: '4000',
      SOLUS_AI_5_API_KEY: 'g',
      SOLUS_AI_5_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      SOLUS_AI_5_MODEL: 'gemini-algum',
      SOLUS_AI_5_NAME: 'gemini',
    });
    const slots = getProviderSlots();
    expect(slots.map((slot) => [slot.name, slot.apiKey, slot.model, slot.maxTokens])).toEqual([
      ['groq.com/modelo-grande', 'gsk', 'modelo-grande', null],
      ['groq.com/modelo-menor', 'gsk', 'modelo-menor', null],
      ['openrouter.ai/deepseek/algum:free', 'sk-or', 'deepseek/algum:free', 4000],
      ['gemini', 'g', 'gemini-algum', null],
    ]);
    expect(slots[1]!.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(getAiProvider()).toBe('openai');
    expect(getAiConfig()).toMatchObject({ model: 'modelo-grande', maxTokens: 8000 });
  });

  it('as variáveis sem número continuam valendo para o primeiro provedor', () => {
    stub({ SOLUS_AI_API_KEY: 'sk', SOLUS_AI_2_API_KEY: 'gsk', SOLUS_AI_2_BASE_URL: 'https://api.groq.com/openai/v1', SOLUS_AI_2_MODEL: 'llama' });
    expect(getProviderSlots().map((slot) => slot.name)).toEqual(['deepseek.com/deepseek-chat', 'groq.com/llama']);
  });

  it('pula provedores incompletos ou inválidos', () => {
    stub({
      SOLUS_AI_2_API_KEY: 'sem-modelo',
      SOLUS_AI_2_BASE_URL: 'https://x.test',
      SOLUS_AI_3_MODEL: 'sem-chave-antes',
      SOLUS_AI_4_API_KEY: 'k',
      SOLUS_AI_4_BASE_URL: 'http://inseguro.test',
      SOLUS_AI_4_MODEL: 'm',
      SOLUS_AI_6_API_KEY: 'k',
      SOLUS_AI_6_BASE_URL: 'https://ok.test/v1',
      SOLUS_AI_6_MODEL: 'modelo',
    });
    expect(getProviderSlots().map((slot) => slot.name)).toEqual(['ok.test/modelo']);
  });

  it('sem nenhum provedor, desligado', () => {
    stub({});
    expect(getProviderSlots()).toEqual([]);
    expect(getAiProvider()).toBeNull();
  });
});

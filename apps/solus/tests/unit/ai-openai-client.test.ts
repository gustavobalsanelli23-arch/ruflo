// @vitest-environment node
import type Anthropic from '@anthropic-ai/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAnalyst, type EngineConfig } from '@/lib/ai/engine';
import {
  createOpenAICompatClient,
  fromChatResponse,
  OpenAICompatConnectionError,
  OpenAICompatError,
  toChatMessages,
  toChatTools,
  type ChatResponse,
} from '@/lib/ai/openai-client';
import { TOOL_DEFINITIONS } from '@/lib/ai/tools';
import { demoAnalystSource } from '@/demo/ai-source';
import { getAiClient, getAiConfig, getAiProvider } from '@/lib/ai/config';
import { friendlyFailure } from '@/services/ai-run';

/**
 * The OpenAI-compatible adapter: translation both ways, transport errors, and
 * the full analyst loop running through it with `fetch` replaced by a script.
 */

type Params = Anthropic.Beta.MessageCreateParamsNonStreaming;

const baseParams = (messages: Params['messages']): Params => ({
  model: 'deepseek-chat',
  max_tokens: 8000,
  system: [{ type: 'text', text: 'Sistema.', cache_control: { type: 'ephemeral' } }],
  tools: TOOL_DEFINITIONS,
  messages,
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
const status = (code: number, body: unknown = { error: { message: `erro ${code}` } }) => new Response(JSON.stringify(body), { status: code });

const chat = (message: Record<string, unknown>, finish = 'stop', usage: Record<string, unknown> = { prompt_tokens: 100, completion_tokens: 20 }): ChatResponse =>
  ({
    id: 'chatcmpl-1',
    model: 'deepseek-chat',
    choices: [{ index: 0, finish_reason: finish, message: { role: 'assistant', ...message } }],
    usage,
  }) as unknown as ChatResponse;

const noSleep = () => Promise.resolve();

describe('pedido', () => {
  it('traduz sistema, mensagens, tool_use, tool_result e notas de sistema', () => {
    const messages = toChatMessages(
      baseParams([
        { role: 'user', content: 'Pergunta?' },
        {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'x', signature: 's' },
            { type: 'text', text: 'Vou consultar.' },
            { type: 'tool_use', id: 't1', name: 'resumo_periodo', input: { periodo: '30d', inicio: null, fim: null } },
          ],
        } as never,
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 't1', content: '{"a":1}' },
            { type: 'tool_result', tool_use_id: 't2', is_error: true, content: 'Parâmetros inválidos.' },
          ],
        },
        { role: 'system', content: 'Limite de tempo.' } as never,
      ]),
    );
    expect(messages).toEqual([
      { role: 'system', content: 'Sistema.' },
      { role: 'user', content: 'Pergunta?' },
      {
        role: 'assistant',
        content: 'Vou consultar.',
        tool_calls: [{ id: 't1', type: 'function', function: { name: 'resumo_periodo', arguments: '{"periodo":"30d","inicio":null,"fim":null}' } }],
      },
      { role: 'tool', tool_call_id: 't1', content: '{"a":1}' },
      { role: 'tool', tool_call_id: 't2', content: 'ERRO: Parâmetros inválidos.' },
      { role: 'user', content: '[Instrução do sistema]\nLimite de tempo.' },
    ]);
  });

  it('assistente sem ferramentas vira texto simples', () => {
    const messages = toChatMessages(baseParams([{ role: 'assistant', content: [{ type: 'text', text: 'Oi.' }] } as never]));
    expect(messages.at(-1)).toEqual({ role: 'assistant', content: 'Oi.' });
  });

  it('ferramentas viram funções, com strict só quando pedido', () => {
    const loose = toChatTools(baseParams([]), false);
    expect(loose).toHaveLength(TOOL_DEFINITIONS.length);
    expect(loose[0]).toEqual({
      type: 'function',
      function: { name: 'resumo_periodo', description: TOOL_DEFINITIONS[0]!.description, parameters: (TOOL_DEFINITIONS[0] as { input_schema: unknown }).input_schema },
    });
    expect(toChatTools(baseParams([]), true)[0]!.function).toMatchObject({ strict: true });
  });

  it('envia o corpo certo, sem parâmetros exclusivos da Anthropic', async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => ok(chat({ content: 'ok' })));
    const client = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://api.deepseek.com/', fetch: fetchMock as never });
    await client.beta.messages.create({ ...baseParams([{ role: 'user', content: 'Oi' }]), thinking: { type: 'adaptive' }, output_config: { effort: 'medium' } } as Params);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer k');
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual(['max_tokens', 'messages', 'model', 'stream', 'tool_choice', 'tools']);
    expect(body).toMatchObject({ model: 'deepseek-chat', max_tokens: 8000, stream: false, tool_choice: 'auto' });
  });
});

describe('resposta', () => {
  it('converte texto, chamadas de ferramenta e uso com cache do DeepSeek', () => {
    const message = fromChatResponse(
      chat(
        { content: 'Consultando.', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'estoque', arguments: '{"limite":5}' } }] },
        'tool_calls',
        { prompt_tokens: 1000, completion_tokens: 50, prompt_cache_hit_tokens: 600 },
      ),
      'deepseek-chat',
    );
    expect(message.stop_reason).toBe('tool_use');
    expect(message.content).toEqual([
      { type: 'text', text: 'Consultando.', citations: null },
      { type: 'tool_use', id: 'c1', name: 'estoque', input: { limite: 5 } },
    ]);
    expect(message.usage).toMatchObject({ input_tokens: 400, output_tokens: 50, cache_read_input_tokens: 600, cache_creation_input_tokens: 0 });
  });

  it('lê o cache no formato OpenAI e cria ids que faltam', () => {
    const message = fromChatResponse(
      chat({ content: null, tool_calls: [{ type: 'function', function: { name: 'grupos', arguments: '' } }] }, 'stop', {
        prompt_tokens: 300,
        completion_tokens: 10,
        prompt_tokens_details: { cached_tokens: 100 },
      }),
      'x',
    );
    expect(message.stop_reason).toBe('tool_use');
    expect(message.content).toEqual([{ type: 'tool_use', id: 'call_1', name: 'grupos', input: {} }]);
    expect(message.usage.cache_read_input_tokens).toBe(100);
  });

  it('argumentos que não são um objeto JSON viram uma entrada inválida (a validação devolve o erro ao modelo)', () => {
    const message = fromChatResponse(chat({ tool_calls: [{ id: 'c1', type: 'function', function: { name: 'grupos', arguments: '{quebrado' } }] }, 'tool_calls'), 'x');
    expect(message.content[0]).toMatchObject({ input: { argumentos_invalidos: '{quebrado' } });
  });

  it('mapeia recusa, filtro de conteúdo e limite de tokens', () => {
    expect(fromChatResponse(chat({ content: null, refusal: 'Não.' }), 'x').stop_reason).toBe('refusal');
    expect(fromChatResponse(chat({ content: '' }, 'content_filter'), 'x').stop_reason).toBe('refusal');
    expect(fromChatResponse(chat({ content: 'meio' }, 'length'), 'x').stop_reason).toBe('max_tokens');
    expect(fromChatResponse(chat({ content: 'fim' }), 'x').stop_reason).toBe('end_turn');
  });

  it('resposta sem choices é erro', () => {
    expect(() => fromChatResponse({ choices: [] }, 'x')).toThrow(OpenAICompatError);
  });
});

describe('transporte', () => {
  const request = baseParams([{ role: 'user', content: 'Oi' }]);

  it('repete em 429 e 5xx e depois responde', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(status(429)).mockResolvedValueOnce(status(503)).mockResolvedValueOnce(ok(chat({ content: 'ok' })));
    const client = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://x.test', fetch: fetchMock, sleep: noSleep });
    const message = await client.beta.messages.create(request);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(message.content).toEqual([{ type: 'text', text: 'ok', citations: null }]);
  });

  it('desiste depois das tentativas e não repete erros de configuração', async () => {
    const always429 = vi.fn(async () => status(429));
    const client = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://x.test', fetch: always429, sleep: noSleep, maxRetries: 2 });
    await expect(client.beta.messages.create(request)).rejects.toMatchObject({ status: 429 });
    expect(always429).toHaveBeenCalledTimes(3);

    const unauthorized = vi.fn(async () => status(401));
    const other = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://x.test', fetch: unauthorized, sleep: noSleep });
    await expect(other.beta.messages.create(request)).rejects.toMatchObject({ status: 401, message: 'erro 401' });
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('trata 200 com { error } (OpenRouter)', async () => {
    const fetchMock = vi.fn(async () => ok({ error: { message: 'Provider returned error', code: 429 } }));
    const client = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://x.test', fetch: fetchMock, sleep: noSleep, maxRetries: 0 });
    await expect(client.beta.messages.create(request)).rejects.toMatchObject({ status: 429, message: 'Provider returned error' });
  });

  it('falha de rede vira erro de conexão; cancelamento passa direto, sem novas tentativas', async () => {
    const network = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const client = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://x.test', fetch: network, sleep: noSleep, maxRetries: 1 });
    await expect(client.beta.messages.create(request)).rejects.toBeInstanceOf(OpenAICompatConnectionError);
    expect(network).toHaveBeenCalledTimes(2);

    const controller = new AbortController();
    controller.abort();
    const aborted = vi.fn(async (_url: string, init: RequestInit) => {
      init.signal?.throwIfAborted();
      return ok(chat({ content: 'x' }));
    });
    const cancelled = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://x.test', fetch: aborted as never, sleep: noSleep });
    await expect(cancelled.beta.messages.create(request, { signal: controller.signal })).rejects.not.toBeInstanceOf(OpenAICompatConnectionError);
    expect(aborted).toHaveBeenCalledTimes(1);
  });

  it('mensagens para a pessoa', () => {
    expect(friendlyFailure(new OpenAICompatError(429, 'x'))).toMatch(/muitas solicitações/);
    expect(friendlyFailure(new OpenAICompatError(402, 'x'))).toMatch(/configuração/);
    expect(friendlyFailure(new OpenAICompatError(500, 'x'))).toMatch(/instável/);
    expect(friendlyFailure(new OpenAICompatConnectionError('x'))).toMatch(/não respondeu/);
  });
});

describe('escolha do provedor', () => {
  afterEach(() => vi.unstubAllEnvs());

  const stub = (values: Record<string, string>) => {
    for (const name of ['SOLUS_AI_PROVIDER', 'ANTHROPIC_API_KEY', 'SOLUS_AI_API_KEY', 'SOLUS_AI_BASE_URL', 'SOLUS_AI_MODEL', 'SOLUS_AI_MAX_TOKENS', 'SOLUS_AI_EFFORT']) {
      vi.stubEnv(name, values[name] ?? '');
    }
  };

  it('sem chave, desligado', () => {
    stub({});
    expect(getAiProvider()).toBeNull();
    expect(getAiConfig()).toBeNull();
  });

  it('só a chave compatível com OpenAI liga o provedor openai com os padrões do DeepSeek', () => {
    stub({ SOLUS_AI_API_KEY: 'sk-x' });
    expect(getAiProvider()).toBe('openai');
    expect(getAiConfig()).toMatchObject({ model: 'deepseek-chat', maxTokens: 8000, maxSteps: 6 });
  });

  it('aceita ids do OpenRouter e limite de saída configurado', () => {
    stub({ SOLUS_AI_API_KEY: 'sk-x', SOLUS_AI_MODEL: 'deepseek/deepseek-chat:free', SOLUS_AI_MAX_TOKENS: '4000', SOLUS_AI_BASE_URL: 'https://openrouter.ai/api/v1' });
    expect(getAiConfig()).toMatchObject({ model: 'deepseek/deepseek-chat:free', maxTokens: 4000 });
  });

  it('Claude continua sendo o padrão quando há a chave da Anthropic', () => {
    stub({ ANTHROPIC_API_KEY: 'sk-ant', SOLUS_AI_API_KEY: 'sk-x' });
    expect(getAiProvider()).toBe('anthropic');
    expect(getAiConfig()).toMatchObject({ model: 'claude-opus-5-5', maxTokens: 16000 });
  });

  it('SOLUS_AI_PROVIDER força o provedor e exige a chave dele', () => {
    stub({ SOLUS_AI_PROVIDER: 'openai', ANTHROPIC_API_KEY: 'sk-ant', SOLUS_AI_API_KEY: 'sk-x' });
    expect(getAiProvider()).toBe('openai');
    stub({ SOLUS_AI_PROVIDER: 'openai', ANTHROPIC_API_KEY: 'sk-ant' });
    expect(getAiProvider()).toBeNull();
    stub({ SOLUS_AI_PROVIDER: 'outro', SOLUS_AI_API_KEY: 'sk-x' });
    expect(getAiProvider()).toBeNull();
  });

  it('recusa URL sem https (exceto localhost)', () => {
    stub({ SOLUS_AI_API_KEY: 'sk-x', SOLUS_AI_BASE_URL: 'http://api.exemplo.com' });
    expect(getAiProvider()).toBeNull();
    stub({ SOLUS_AI_API_KEY: 'sk-x', SOLUS_AI_BASE_URL: 'http://localhost:11434/v1' });
    expect(getAiProvider()).toBe('openai');
  });

  it('o cliente acompanha o provedor configurado', () => {
    stub({ SOLUS_AI_API_KEY: 'sk-x' });
    const openai = getAiClient();
    expect(getAiClient()).toBe(openai);
    stub({ ANTHROPIC_API_KEY: 'sk-ant' });
    expect(getAiClient()).not.toBe(openai);
  });
});

describe('laço completo pelo adaptador', () => {
  const config: EngineConfig = { model: 'deepseek-chat', effort: 'medium', maxSteps: 6, softDeadlineMs: 60_000, maxTokens: 8000 };

  it('consulta, recebe o resultado como mensagem "tool" e responde com números conferidos', async () => {
    const bodies: { messages: { role: string; content: string | null; tool_call_id?: string }[] }[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      bodies.push(body);
      if (bodies.length === 1) {
        return ok(
          chat(
            { content: null, tool_calls: [{ id: 'call_a', type: 'function', function: { name: 'resumo_periodo', arguments: '{"periodo":"30d","inicio":null,"fim":null}' } }] },
            'tool_calls',
          ),
        );
      }
      const tool = body.messages.find((message: { role: string; tool_call_id?: string }) => message.role === 'tool' && message.tool_call_id === 'call_a');
      const metrics = (JSON.parse(tool.content) as { metricas: { id: string; valor_formatado: string }[] }).metricas;
      const revenue = metrics.find((metric) => metric.id === 'receita_liquida')!;
      const answer = {
        resumo: `A receita líquida dos últimos 30 dias foi de ${revenue.valor_formatado}.`,
        blocos: [{ tipo: 'indicadores', ref: 'R1', titulo: 'Indicadores', campos: ['receita_liquida'] }],
        fatos: [],
        hipoteses: [],
        recomendacoes: [],
        limitacoes: [],
        perguntas_seguintes: [],
      };
      return ok(chat({ content: null, tool_calls: [{ id: 'call_b', type: 'function', function: { name: 'responder', arguments: JSON.stringify(answer) } }] }, 'tool_calls'));
    });

    const client = createOpenAICompatClient({ apiKey: 'k', baseUrl: 'https://api.deepseek.com', fetch: fetchMock as never, sleep: noSleep });
    const result = await runAnalyst(client, config, demoAnalystSource(), { question: 'Como foram as vendas?', history: [], mode: 'chat', today: '2026-10-29' });

    expect(result.status).toBe('answered');
    expect(result.toolCalls).toEqual([{ name: 'resumo_periodo', ref: 'R1', ok: true }]);
    expect(result.usage.requests).toBe(2);
    expect(result.models).toEqual(['deepseek-chat']);
    expect(bodies[1]!.messages.map((message) => message.role)).toEqual(['system', 'user', 'assistant', 'tool']);
    expect(result.answer?.blocks.some((block) => block.kind === 'metrics')).toBe(true);
  });
});

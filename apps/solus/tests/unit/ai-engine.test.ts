// @vitest-environment node
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { runAnalyst, type EngineConfig, type MessagesClient } from '@/lib/ai/engine';
import type { AnalystDataSource } from '@/lib/ai/types';
import { demoAnalystSource } from '@/demo/ai-source';

/**
 * The analyst loop with the model replaced by a script. Each scripted turn
 * sees the request the engine built (so it can read the real tool results,
 * computed from the demo dataset) and returns what the model would.
 */

type Params = Anthropic.Beta.MessageCreateParamsNonStreaming;
type Turn = (params: Params) => { content: unknown[]; stop_reason?: Anthropic.Beta.BetaMessage['stop_reason'] };

const config: EngineConfig = { model: 'claude-opus-5-5', effort: 'medium', maxSteps: 6, softDeadlineMs: 60_000, maxTokens: 16_000 };

function scripted(turns: Turn[]) {
  const calls: Params[] = [];
  const client: MessagesClient = {
    beta: {
      messages: {
        create: vi.fn(async (params: Params) => {
          calls.push(structuredClone(params));
          const turn = turns[calls.length - 1];
          if (!turn) throw new Error('turno não roteirizado');
          const { content, stop_reason = 'tool_use' } = turn(params);
          return {
            id: `msg_${calls.length}`,
            type: 'message',
            role: 'assistant',
            model: 'claude-opus-5-5',
            content,
            stop_reason,
            stop_sequence: null,
            usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 800, cache_creation_input_tokens: 0 },
          } as unknown as Anthropic.Beta.BetaMessage;
        }),
      },
    },
  };
  return { client, calls };
}

const use = (id: string, name: string, input: unknown) => ({ type: 'tool_use', id, name, input });

/** Tool results the engine sent in the last user turn, by tool_use id. */
function lastResults(params: Params): Record<string, { content: string; is_error?: boolean }> {
  const last = params.messages.at(-1)!;
  const blocks = Array.isArray(last.content) ? (last.content as { type: string; tool_use_id: string; content: string; is_error?: boolean }[]) : [];
  return Object.fromEntries(blocks.filter((block) => block.type === 'tool_result').map((block) => [block.tool_use_id, block]));
}

const PERIOD = { periodo: '30d', inicio: null, fim: null };

function answer(overrides: Record<string, unknown> = {}) {
  return {
    resumo: 'Resumo.',
    blocos: [],
    fatos: [],
    hipoteses: [],
    recomendacoes: [],
    limitacoes: [],
    perguntas_seguintes: [],
    ...overrides,
  };
}

/** A tool result anywhere in the conversation sent to the model. */
function resultFor(params: Params, id: string): string {
  for (const message of params.messages) {
    if (!Array.isArray(message.content)) continue;
    for (const block of message.content as { type: string; tool_use_id?: string; content?: string }[]) {
      if (block.type === 'tool_result' && block.tool_use_id === id) return block.content ?? '';
    }
  }
  throw new Error(`sem resultado para ${id}`);
}

type Metric = { id: string; valor_formatado: string; variacao_formatada: string };
const metricsOf = (params: Params, id = 't1') => (JSON.parse(resultFor(params, id)) as { metricas: Metric[] }).metricas;

describe('fluxo', () => {
  it('consulta, responde com valores copiados dos dados e monta indicadores a partir do resultado', async () => {
    const { client, calls } = scripted([
      () => ({ content: [use('t1', 'resumo_periodo', PERIOD)] }),
      (params) => {
        const metrics = metricsOf(params);
        const revenue = metrics.find((m) => m.id === 'receita_liquida')!;
        const margin = metrics.find((m) => m.id === 'margem_bruta')!;
        return {
          content: [
            use(
              'r1',
              'responder',
              answer({
                resumo: `A receita líquida dos últimos 30 dias foi de ${revenue.valor_formatado}, com margem bruta de ${margin.valor_formatado}.`,
                blocos: [{ tipo: 'indicadores', ref: 'R1', titulo: 'Indicadores', campos: ['receita_liquida', 'margem_bruta'] }],
                fatos: [`Receita líquida variou ${revenue.variacao_formatada} contra o período anterior.`],
                hipoteses: ['A sazonalidade pode explicar parte da variação.'],
              }),
            ),
          ],
        };
      },
    ]);
    const steps: string[] = [];
    const result = await runAnalyst(client, config, demoAnalystSource(), {
      question: 'Como foram as vendas no último mês?',
      history: [],
      mode: 'chat',
      today: '2026-10-29',
      onProgress: (event) => steps.push(event.label),
    });

    expect(result.status).toBe('answered');
    expect(result.grounding).toEqual({ corrected: false, unverified: [] });
    expect(steps).toEqual(['Somando os totais do período']);
    expect(result.toolCalls).toEqual([{ name: 'resumo_periodo', ref: 'R1', ok: true }]);
    expect(result.usage).toEqual({ requests: 2, inputTokens: 2000, outputTokens: 400, cacheReadTokens: 1600, cacheWriteTokens: 0 });

    const blocks = result.answer!.blocks;
    expect(blocks[0]).toEqual({ kind: 'summary', text: expect.stringContaining('A receita líquida dos últimos 30 dias foi de R$') });
    const cards = blocks.find((block) => block.kind === 'metrics');
    expect(cards).toEqual({ kind: 'metrics', items: [expect.objectContaining({ label: 'Receita líquida' }), expect.objectContaining({ label: 'Margem bruta' })] });
    expect(blocks.find((block) => block.kind === 'findings')).toEqual({
      kind: 'findings',
      facts: [expect.stringContaining('contra o período anterior')],
      hypotheses: ['A sazonalidade pode explicar parte da variação.'],
    });
    expect(blocks.find((block) => block.kind === 'sources')).toEqual({ kind: 'sources', items: [{ name: 'Totais do período', detail: expect.stringContaining('Últimos 30 dias') }] });

    // O pedido ao modelo: ferramentas estritas, prompt em cache, fallback do servidor, esforço explícito.
    const first = calls[0]!;
    expect(first.model).toBe('claude-opus-5-5');
    expect(first.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(first.fallbacks).toBe('default');
    expect(first.output_config).toEqual({ effort: 'medium' });
    expect(first.thinking).toEqual({ type: 'adaptive' });
    expect(first.system).toEqual([expect.objectContaining({ cache_control: { type: 'ephemeral' } })]);
    expect((first.tools as { name: string; strict?: boolean }[]).every((tool) => tool.strict)).toBe(true);
    expect(first.messages[0]!.content).toEqual(expect.stringContaining('<pergunta>\nComo foram as vendas no último mês?\n</pergunta>'));
    expect(first.messages[0]!.content).toEqual(expect.stringContaining('dados fictícios de demonstração'));
  });

  it('número inventado: devolve a lista ao modelo uma vez; corrigido, a resposta passa', async () => {
    let revenue = '';
    const { client, calls } = scripted([
      () => ({ content: [use('t1', 'resumo_periodo', PERIOD)] }),
      () => ({ content: [use('r1', 'responder', answer({ resumo: 'A receita foi de R$ 999.999,99.' }))] }),
      (params) => {
        expect(lastResults(params).r1).toEqual(expect.objectContaining({ is_error: true, content: expect.stringContaining('R$ 999.999,99') }));
        revenue = metricsOf(params).find((m) => m.id === 'receita_liquida')!.valor_formatado;
        return { content: [use('r2', 'responder', answer({ resumo: `A receita foi de ${revenue}.` }))] };
      },
    ]);
    const result = await runAnalyst(client, config, demoAnalystSource(), { question: 'Receita?', history: [], mode: 'chat', today: '2026-10-29' });
    expect(calls).toHaveLength(3);
    expect(result.status).toBe('answered');
    expect(result.grounding).toEqual({ corrected: true, unverified: [] });
    expect(result.answer!.blocks[0]).toEqual({ kind: 'summary', text: `A receita foi de ${revenue}.` });
  });

  it('número inventado duas vezes: o trecho sai e a resposta avisa', async () => {
    const { client } = scripted([
      () => ({ content: [use('t1', 'resumo_periodo', PERIOD)] }),
      () => ({ content: [use('r1', 'responder', answer({ resumo: 'A receita foi de R$ 999.999,99.', fatos: ['Lucro de R$ 777.777,77.'] }))] }),
      () => ({
        content: [use('r2', 'responder', answer({ resumo: 'A receita cresceu. A receita foi de R$ 999.999,99.', fatos: ['Lucro de R$ 777.777,77.', 'Os dados cobrem o período.'] }))],
      }),
    ]);
    const result = await runAnalyst(client, config, demoAnalystSource(), { question: 'Receita?', history: [], mode: 'chat', today: '2026-10-29' });
    expect(result.status).toBe('partial');
    expect(result.answer!.removed).toEqual(['A receita foi de R$ 999.999,99.', 'Lucro de R$ 777.777,77.']);
    const blocks = result.answer!.blocks;
    expect(blocks[0]).toEqual({ kind: 'summary', text: 'A receita cresceu.' });
    expect(blocks.find((block) => block.kind === 'findings')).toEqual({ kind: 'findings', facts: ['Os dados cobrem o período.'], hypotheses: [] });
    expect(blocks.find((block) => block.kind === 'notice' && block.tone === 'warning')).toBeTruthy();
    expect(JSON.stringify(blocks)).not.toContain('999.999');
  });
});

describe('limites e falhas', () => {
  it('recusa do modelo vira mensagem clara, sem resposta', async () => {
    const { client } = scripted([() => ({ content: [], stop_reason: 'refusal' })]);
    const result = await runAnalyst(client, config, demoAnalystSource(), { question: '…', history: [], mode: 'chat', today: '2026-10-29' });
    expect(result).toEqual(expect.objectContaining({ status: 'refused', answer: null, failure: expect.stringContaining('recusou') }));
  });

  it('parâmetros inválidos voltam como erro da ferramenta; a fonte de dados não é chamada', async () => {
    const source = demoAnalystSource();
    const spy = vi.spyOn(source, 'products');
    const { client, calls } = scripted([
      () => ({ content: [use('t1', 'produtos', { ...PERIOD, ordenar_por: 'receita_liquida', ordem: 'maior', limite: 500, categoria: null, fornecedor: null, busca: null })] }),
      (params) => {
        expect(lastResults(params).t1).toEqual(expect.objectContaining({ is_error: true, content: expect.stringContaining('limite') }));
        return { content: [use('r1', 'responder', answer({ resumo: 'Não consegui consultar os produtos.' }))] };
      },
    ]);
    const result = await runAnalyst(client, config, source, { question: 'Top produtos?', history: [], mode: 'chat', today: '2026-10-29' });
    expect(spy).not.toHaveBeenCalled();
    expect(result.toolCalls).toEqual([{ name: 'produtos', ref: null, ok: false }]);
    expect(calls).toHaveLength(2);
  });

  it('texto solto sem "responder": um lembrete; de novo, falha', async () => {
    const text = () => ({ content: [{ type: 'text', text: 'A receita foi ótima.' }], stop_reason: 'end_turn' as const });
    const { client, calls } = scripted([text, text]);
    const result = await runAnalyst(client, config, demoAnalystSource(), { question: '…', history: [], mode: 'chat', today: '2026-10-29' });
    expect(result.status).toBe('failed');
    expect(calls[1]!.messages.at(-1)).toEqual({ role: 'user', content: expect.stringContaining('responder') });
  });

  it('"responder" junto com uma consulta é devolvido para ser chamado sozinho', async () => {
    const { client } = scripted([
      () => ({ content: [use('t1', 'resumo_periodo', PERIOD), use('r1', 'responder', answer())] }),
      (params) => {
        expect(lastResults(params).r1).toEqual(expect.objectContaining({ is_error: true }));
        expect(lastResults(params).t1).toEqual(expect.not.objectContaining({ is_error: true }));
        return { content: [use('r2', 'responder', answer({ resumo: 'Pronto.' }))] };
      },
    ]);
    const result = await runAnalyst(client, config, demoAnalystSource(), { question: '…', history: [], mode: 'chat', today: '2026-10-29' });
    expect(result.status).toBe('answered');
  });

  it('passado o tempo, o modelo é avisado e novas consultas são recusadas', async () => {
    let clock = 0;
    const { client, calls } = scripted([
      () => {
        clock = 120_000;
        return { content: [use('t1', 'resumo_periodo', PERIOD)] };
      },
      (params) => {
        expect(params.messages.at(-1)).toEqual(expect.objectContaining({ role: 'system' }));
        return { content: [use('t2', 'estoque', { situacoes: [], categoria: null, ordenar_por: 'capital', ordem: 'maior', limite: 5 })] };
      },
      (params) => {
        expect(lastResults(params).t2).toEqual(expect.objectContaining({ is_error: true, content: expect.stringContaining('Limite de tempo') }));
        return { content: [use('r1', 'responder', answer({ resumo: 'Resposta com o que foi consultado.' }))] };
      },
    ]);
    const result = await runAnalyst(client, config, demoAnalystSource(), { question: '…', history: [], mode: 'chat', today: '2026-10-29' }, () => clock);
    expect(result.status).toBe('answered');
    expect(calls).toHaveLength(3);
  });

  it('bloco com ref inexistente é descartado, sem inventar visualização', async () => {
    const { client } = scripted([
      () => ({ content: [use('t1', 'resumo_periodo', PERIOD)] }),
      () => ({ content: [use('r1', 'responder', answer({ blocos: [{ tipo: 'tabela', ref: 'R9', titulo: 'Tabela', campos: [] }] }))] }),
    ]);
    const result = await runAnalyst(client, config, demoAnalystSource(), { question: '…', history: [], mode: 'chat', today: '2026-10-29' });
    expect(result.answer!.dropped).toEqual([expect.stringContaining('R9')]);
    expect(result.answer!.blocks.some((block) => block.kind === 'table')).toBe(false);
  });

  it('a conversa anterior vai como contexto, avisando que números antigos precisam ser consultados de novo', async () => {
    const { client, calls } = scripted([() => ({ content: [use('r1', 'responder', answer())] })]);
    await runAnalyst(client, config, demoAnalystSource(), {
      question: 'E no mês anterior?',
      history: [{ question: 'Como foi outubro?', answer: 'Receita de R$ 10,00.' }],
      mode: 'chat',
      today: '2026-10-29',
    });
    const first = calls[0]!.messages[0]!.content as string;
    expect(first).toContain('Pergunta: Como foi outubro?');
    expect(first).toContain('só podem ser repetidos se você consultá-los de novo');
  });
});

describe('fonte de dados', () => {
  it('as ferramentas só chamam a fonte recebida', async () => {
    const calls: string[] = [];
    const base = demoAnalystSource();
    const source = new Proxy(base, {
      get: (target, prop: keyof AnalystDataSource) => {
        const value = target[prop];
        return typeof value === 'function'
          ? (...args: unknown[]) => {
              calls.push(prop);
              return (value as (...a: unknown[]) => unknown).apply(target, args);
            }
          : value;
      },
    });
    const { client } = scripted([
      () => ({ content: [use('t1', 'grupos', { ...PERIOD, agrupar_por: 'categoria' }), use('t2', 'oportunidades', { situacao: 'abertas', id: null })] }),
      () => ({ content: [use('r1', 'responder', answer())] }),
    ]);
    await runAnalyst(client, config, source, { question: '…', history: [], mode: 'chat', today: '2026-10-29' });
    expect(calls.sort()).toEqual(['context', 'groups', 'groups', 'opportunities']);
  });
});

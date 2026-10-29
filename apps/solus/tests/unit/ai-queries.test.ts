// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveRange } from '@/lib/ai/periods';
import { formatPoints } from '@/lib/format';
import { runDataTool } from '@/lib/ai/tools';
import type { AnalystDataSource, SourceContext, ToolOutput } from '@/lib/ai/types';
import type { Opportunity } from '@/lib/data/types';
import type { InventoryPosition, PeriodTotals, ProductMetrics } from '@/lib/intelligence/types';

/**
 * The analyst's data tools over a small fake source. Expected values are
 * worked out by hand from the source below: the tools only select, sort,
 * compare two values from the source and format them.
 */

const context: SourceContext = { environment: 'tenant', organization: 'Mercearia Teste', lastSale: '2026-03-31', firstSale: '2025-01-01', lastSnapshot: '2026-03-31', notes: [] };

const totals = (overrides: Partial<PeriodTotals>): PeriodTotals => ({
  grossRevenue: 0, discounts: 0, returns: 0, netRevenue: 0, costedNetRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: null, costCoverage: null,
  orders: 0, averageTicket: null, unitsSold: 0, saleLines: 0, activeDays: 0, catalogCostLines: 0, uncostedLines: 0, ...overrides,
});

const product = (id: string, overrides: Partial<ProductMetrics>): ProductMetrics => ({
  productId: id, sku: id.toUpperCase(), name: `Produto ${id}`, categoryId: 'c1', categoryName: 'Mercearia', supplierId: 's1', supplierName: 'Distribuidora Sul',
  catalogComplete: true, grossRevenue: 0, discounts: 0, returns: 0, netRevenue: 0, costedNetRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: null,
  costCoverage: 1, discountRate: 0, unitsSold: 0, orders: 0, saleDays: 10, fileCostLines: 10, catalogCostLines: 0, uncostedLines: 0, averagePrice: null, averageCost: null,
  ...overrides,
});

const CURRENT = { start: '2026-03-02', end: '2026-03-31' };

const source: AnalystDataSource = {
  context: async () => context,
  parameters: async () => { throw new Error('não usado'); },
  totals: async (range) =>
    range.start === CURRENT.start
      ? totals({ grossRevenue: 1100, discounts: 50, returns: 50, netRevenue: 1000, costedNetRevenue: 800, cogs: 600, grossProfit: 200, grossMargin: 0.25, costCoverage: 0.8, orders: 40, averageTicket: 25, unitsSold: 120, saleLines: 90 })
      : totals({ grossRevenue: 800, netRevenue: 800, costedNetRevenue: 800, cogs: 560, grossProfit: 240, grossMargin: 0.3, costCoverage: 1, orders: 32, averageTicket: 25, unitsSold: 100, saleLines: 70 }),
  daily: async () => [],
  products: async (range) =>
    range.start === CURRENT.start
      ? [
          product('a', { netRevenue: 600, costedNetRevenue: 600, grossProfit: 150, grossMargin: 0.25, unitsSold: 60 }),
          product('b', { netRevenue: 300, costedNetRevenue: 300, grossProfit: -30, grossMargin: -0.1, unitsSold: 40, categoryName: 'Bebidas' }),
          product('c', { netRevenue: 100, costedNetRevenue: 0, grossProfit: 0, grossMargin: null, costCoverage: 0, unitsSold: 20 }),
        ]
      : [product('a', { netRevenue: 400 }), product('b', { netRevenue: 400 })],
  groups: async () => [],
  stock: async () => ({
    asOf: '2026-03-31',
    stockValue: 5000,
    annualTurnover: 4.2,
    positions: [
      { productId: 'a', sku: 'A', name: 'Produto a', categoryName: 'Mercearia', status: 'stalled', stockValue: 3000, coverageDays: null, daysSinceLastSale: 90 },
      { productId: 'b', sku: 'B', name: 'Produto b', categoryName: 'Bebidas', status: 'rupture-risk', stockValue: 200, coverageDays: 3, daysSinceLastSale: 0 },
      { productId: 'c', sku: 'C', name: 'Produto c', categoryName: 'Mercearia', status: 'high-turnover', stockValue: 1800, coverageDays: 20, daysSinceLastSale: 1 },
    ].map((position) => ({ supplierName: null, perishable: false, snapshotDate: '2026-03-31', snapshotAgeDays: 0, onHand: 10, unitCost: 5, costSource: 'file', windowDays: 90, historyDays: 400, unitsWindow: 30, avgDailyUnits: 1, annualTurnover: null, lastSaleDate: null, leadTimeDays: 7, ...position }) as InventoryPosition),
  }),
  opportunities: async () => [
    { id: 'op-1', title: 'Margem negativa em Produto b', category: 'pricing', impact: 90, impactKind: 'monthly', priority: 'high', confidence: 0.8, status: 'new', detectedAt: '2026-03-31', summary: 'Vendido abaixo do custo.', finding: '', whyItMatters: 'Cada venda reduz o lucro.', assumptions: ['Prejuízo por 30 dias.'], recommendation: ['Rever o preço.'], evidence: [{ label: 'Margem bruta', value: '-10,0%', detail: 'Métricas de vendas', basis: 'fact' }], products: ['b'], hypotheses: ['Custo desatualizado.'] },
    { id: 'op-2', title: 'Estoque parado: Produto a', category: 'inventory', impact: 3000, impactKind: 'capital', priority: 'medium', confidence: 0.85, status: 'dismissed', detectedAt: '2026-03-31', summary: '', finding: '', whyItMatters: '', assumptions: [], recommendation: [], evidence: [], products: ['a'] },
  ] satisfies Opportunity[],
};

const PERIOD = { periodo: '30d', inicio: null, fim: null };
const run = async (name: string, input: unknown) => {
  const output = await runDataTool(name, input, 'R1', source, context);
  if ('error' in output) throw new Error(output.error);
  return output as ToolOutput;
};

describe('períodos', () => {
  it('terminam na última venda importada; o anterior tem o mesmo tamanho', () => {
    expect(resolveRange({ periodo: '30d', inicio: null, fim: null }, context)).toEqual(
      expect.objectContaining({ current: CURRENT, previous: { start: '2026-01-31', end: '2026-03-01' }, days: 30 }),
    );
  });

  it('personalizado: valida datas e limita ao histórico importado', () => {
    expect(resolveRange({ periodo: 'personalizado', inicio: '2026-03-10', fim: '2026-03-01' }, context)).toEqual({ error: 'O início do período é depois do fim.' });
    expect(resolveRange({ periodo: 'personalizado', inicio: '2027-01-01', fim: '2027-02-01' }, context)).toEqual({ error: expect.stringContaining('Sem vendas nesse período') });
    expect(resolveRange({ periodo: 'personalizado', inicio: '2026-03-15', fim: '2026-12-31' }, context)).toEqual(
      expect.objectContaining({ current: { start: '2026-03-15', end: '2026-03-31' }, previous: { start: '2026-02-26', end: '2026-03-14' }, days: 17 }),
    );
  });

  it('sem vendas importadas não há período', () => {
    expect(resolveRange({ periodo: '7d', inicio: null, fim: null }, { ...context, lastSale: null, firstSale: null })).toEqual({ error: expect.stringContaining('Não há vendas') });
  });
});

describe('resumo_periodo', () => {
  it('variações em percentual e a margem em pontos percentuais, com as limitações do período', async () => {
    const output = await run('resumo_periodo', PERIOD);
    const metrics = Object.fromEntries((output.data.metricas as { id: string }[]).map((metric) => [metric.id, metric]));
    expect(metrics.receita_liquida).toEqual(expect.objectContaining({ valor: 1000, anterior: 800, variacao: 25, variacao_formatada: '+25,0%' }));
    expect(metrics.lucro_bruto).toEqual(expect.objectContaining({ valor: 200, anterior: 240, variacao: -16.7 }));
    expect(metrics.margem_bruta).toEqual(expect.objectContaining({ valor: 25, anterior: 30, variacao: -5, unidade_variacao: 'pontos percentuais' }));
    expect(metrics.margem_bruta).toEqual(expect.objectContaining({ variacao_formatada: formatPoints(0.25 - 0.3) }));
    expect(output.data.limitacoes).toEqual(['Margem e lucro calculados sobre 80,0% da receita (a parte com custo conhecido).']);
    expect(output.metrics!.find((metric) => metric.id === 'lucro_bruto')).toEqual(expect.objectContaining({ tone: 'negative' }));
    expect(output.metrics!.find((metric) => metric.id === 'cmv')).toEqual(expect.objectContaining({ tone: 'negative' }));
  });
});

describe('produtos', () => {
  it('ordena, filtra, limita e compara com o período anterior', async () => {
    const top = await run('produtos', { ...PERIOD, ordenar_por: 'variacao_receita', ordem: 'menor', limite: 5, categoria: null, fornecedor: null, busca: null });
    // b: 300 vs 400 = -25%; a: 600 vs 400 = +50%; c sem período anterior fica de fora desta ordenação.
    expect((top.data.produtos as { sku: string; variacao_receita_pct: number }[]).map((row) => [row.sku, row.variacao_receita_pct])).toEqual([
      ['B', -25],
      ['A', 50],
    ]);
    expect(top.data.produtos_encontrados).toBe(3);

    const drinks = await run('produtos', { ...PERIOD, ordenar_por: 'receita_liquida', ordem: 'maior', limite: 5, categoria: 'bebida', fornecedor: null, busca: null });
    expect((drinks.data.produtos as { sku: string }[]).map((row) => row.sku)).toEqual(['B']);

    const profit = await run('produtos', { ...PERIOD, ordenar_por: 'lucro_bruto', ordem: 'maior', limite: 1, categoria: null, fornecedor: null, busca: null });
    expect(profit.table!.rows).toEqual([expect.objectContaining({ produto: 'Produto a', lucro_bruto: expect.stringContaining('150,00'), margem_bruta: '25,0%' })]);
  });

  it('produto sem custo não mostra lucro como zero', async () => {
    const output = await run('produtos', { ...PERIOD, ordenar_por: 'receita_liquida', ordem: 'menor', limite: 1, categoria: null, fornecedor: null, busca: 'produto c' });
    expect(output.table!.rows[0]).toEqual(expect.objectContaining({ lucro_bruto: 'sem custo', margem_bruta: '—' }));
  });

  it('limite fora da faixa é recusado antes de consultar', async () => {
    const output = await runDataTool('produtos', { ...PERIOD, ordenar_por: 'receita_liquida', ordem: 'maior', limite: 50, categoria: null, fornecedor: null, busca: null }, 'R1', source, context);
    expect(output).toEqual({ error: expect.stringContaining('limite') });
  });
});

describe('estoque e oportunidades', () => {
  it('estoque: totais por situação e filtro', async () => {
    const output = await run('estoque', { situacoes: ['stalled', 'rupture-risk'], categoria: null, ordenar_por: 'capital', ordem: 'maior', limite: 10 });
    expect(output.data.por_situacao).toEqual([
      { situacao: 'rupture-risk', rotulo: 'Risco de ruptura', itens: 1, capital: 200 },
      { situacao: 'stalled', rotulo: 'Parado', itens: 1, capital: 3000 },
      { situacao: 'high-turnover', rotulo: 'Giro alto', itens: 1, capital: 1800 },
    ]);
    expect((output.data.itens as { sku: string }[]).map((row) => row.sku)).toEqual(['A', 'B']);
    expect(output.data.observacao).toContain('não lucro');
  });

  it('oportunidades: abertas por padrão; por id traz fatos e hipóteses; id de fora não existe', async () => {
    const open = await run('oportunidades', { situacao: 'abertas', id: null });
    expect((open.data.oportunidades as { id: string }[]).map((row) => row.id)).toEqual(['op-1']);
    const detail = await run('oportunidades', { situacao: 'todas', id: 'op-1' });
    expect(detail.data.oportunidades).toEqual([
      expect.objectContaining({ fatos: [{ rotulo: 'Margem bruta', valor: '-10,0%', fonte: 'Métricas de vendas' }], hipoteses: ['Custo desatualizado.'], tipo_de_impacto: 'lucro bruto por mês (estimativa)' }),
    ]);
    expect(await runDataTool('oportunidades', { situacao: 'todas', id: 'outra-org' }, 'R1', source, context)).toEqual({ error: 'Oportunidade não encontrada nesta organização.' });
  });

  it('ferramenta desconhecida e campos a mais são recusados', async () => {
    expect(await runDataTool('apagar_tudo', {}, 'R1', source, context)).toEqual({ error: 'Ferramenta desconhecida: apagar_tudo.' });
    expect(await runDataTool('resumo_periodo', { ...PERIOD, sql: 'select 1' }, 'R1', source, context)).toEqual({ error: expect.stringContaining('Parâmetros inválidos') });
  });
});

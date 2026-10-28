// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { runEngine } from '@/lib/intelligence/engine';
import { priorityFor } from '@/lib/intelligence/scoring';
import type { AnalysisParameters, EngineInput, InventoryPosition, PeriodTotals, ProductMetrics } from '@/lib/intelligence/types';

const PARAMS: AnalysisParameters = {
  minMargin: 0.2,
  maxDiscountRate: 0.15,
  stalledDays: 60,
  velocityWindowDays: 90,
  defaultLeadTimeDays: 7,
  highTurnoverDays: 30,
  lowTurnoverDays: 90,
  excessCoverageDays: 120,
  targetCoverageDays: 45,
  dropThreshold: 0.3,
};

const WINDOW = { start: '2026-01-01', end: '2026-03-31', days: 90 };

function product(id: string, fields: Partial<ProductMetrics> = {}): ProductMetrics {
  return {
    productId: id,
    sku: id.toUpperCase(),
    name: `Produto ${id}`,
    categoryId: null,
    categoryName: null,
    supplierId: null,
    supplierName: null,
    catalogComplete: true,
    grossRevenue: 9000,
    discounts: 0,
    returns: 0,
    netRevenue: 9000,
    costedNetRevenue: 9000,
    cogs: 6300,
    grossProfit: 2700,
    grossMargin: 0.3,
    costCoverage: 1,
    discountRate: 0,
    unitsSold: 900,
    orders: 300,
    saleDays: 20,
    fileCostLines: 300,
    catalogCostLines: 0,
    uncostedLines: 0,
    averagePrice: 10,
    averageCost: 7,
    ...fields,
  };
}

function position(id: string, fields: Partial<InventoryPosition> = {}): InventoryPosition {
  return {
    productId: id,
    sku: id.toUpperCase(),
    name: `Produto ${id}`,
    categoryName: null,
    supplierName: null,
    perishable: false,
    snapshotDate: '2026-03-31',
    snapshotAgeDays: 0,
    onHand: 100,
    unitCost: 10,
    costSource: 'file',
    stockValue: 1000,
    windowDays: 90,
    historyDays: 180,
    unitsWindow: 90,
    avgDailyUnits: 1,
    coverageDays: 100,
    annualTurnover: 3.65,
    lastSaleDate: '2026-03-30',
    daysSinceLastSale: 1,
    leadTimeDays: 7,
    status: 'low-turnover',
    ...fields,
  };
}

const TOTALS: PeriodTotals = {
  grossRevenue: 90000,
  discounts: 0,
  returns: 0,
  netRevenue: 90000,
  costedNetRevenue: 90000,
  cogs: 81000,
  grossProfit: 9000,
  grossMargin: 0.1,
  costCoverage: 1,
  orders: 3000,
  averageTicket: 30,
  unitsSold: 9000,
  saleLines: 9000,
  activeDays: 90,
  catalogCostLines: 0,
  uncostedLines: 0,
};

function input(fields: Partial<EngineInput> = {}): EngineInput {
  return {
    params: PARAMS,
    dataThrough: '2026-03-31',
    firstSale: '2025-10-01',
    window: WINDOW,
    totals: TOTALS,
    products: [],
    comparison: null,
    inventory: null,
    ...fields,
  };
}

const byKey = (result: ReturnType<typeof runEngine>) => Object.fromEntries(result.opportunities.map((o) => [o.dedupeKey, o]));

describe('regras de margem', () => {
  it('margem negativa: impacto = prejuízo bruto mensal; prioridade pela participação no lucro da empresa', () => {
    const result = runEngine(input({ products: [product('a', { grossProfit: -300, grossMargin: -0.0333, cogs: 9300 })] }));
    const opportunity = byKey(result)['negative_margin:product:a']!;
    // 300 em 90 dias → 100 por 30 dias; lucro mensal da empresa 3.000 → 3,3% → alta
    expect(opportunity.impactValue).toBe(100);
    expect(opportunity.impactKind).toBe('monthly_profit');
    expect(opportunity.priority).toBe('high');
    expect(opportunity.confidence).toBe(0.85);
    expect(opportunity.facts.map((fact) => fact.label)).toContain('CMV (custo histórico das vendas)');
    expect(opportunity.hypotheses.length).toBeGreaterThan(0);
  });

  it('margem baixa: (mínima − atual) × receita com custo, mensal', () => {
    const result = runEngine(input({ products: [product('b', { grossMargin: 0.1, grossProfit: 900 })] }));
    const opportunity = byKey(result)['low_margin:product:b']!;
    // (0,20 − 0,10) × 9.000 = 900 em 90 dias → 300/mês → 10% do lucro mensal → crítica
    expect(opportunity.impactValue).toBe(300);
    expect(opportunity.priority).toBe('critical');
  });

  it('uma oportunidade de margem por produto; o desconto alto vira hipótese da margem negativa', () => {
    const result = runEngine(input({ products: [product('c', { grossProfit: -600, grossMargin: -0.07, discountRate: 0.25, discounts: 2250 })] }));
    expect(result.opportunities.map((o) => o.dedupeKey)).toEqual(['negative_margin:product:c']);
    expect(result.opportunities[0]!.hypotheses.join(' ')).toMatch(/Descontos de 25,0%/);
  });

  it('descontos acima do limite com margem saudável', () => {
    const result = runEngine(input({ products: [product('d', { grossRevenue: 6000, discounts: 1500, discountRate: 0.25, netRevenue: 4500, costedNetRevenue: 4500, grossMargin: 0.3 })] }));
    // (0,25 − 0,15) × 6.000 = 600 em 90 dias → 200/mês
    expect(byKey(result)['profitability:discount:product:d']!.impactValue).toBe(200);
  });

  it('custo subiu e o preço não acompanhou (30 dias × 30 anteriores)', () => {
    const current = product('e', { averageCost: 8.4, averagePrice: 10.1, grossMargin: 0.17, costedNetRevenue: 3000, saleDays: 10 });
    const previous = product('e', { averageCost: 7, averagePrice: 10, grossMargin: 0.3, costedNetRevenue: 3000, saleDays: 10 });
    const comparison = {
      current: { start: '2026-03-02', end: '2026-03-31', days: 30 },
      previous: { start: '2026-01-31', end: '2026-03-01', days: 30 },
      currentProducts: [current],
      previousProducts: [previous],
    };
    const result = runEngine(input({ products: [product('e')], comparison }));
    const opportunity = byKey(result)['profitability:cost_pass_through:product:e']!;
    // (0,30 − 0,17) × 3.000 em 30 dias = 390/mês
    expect(opportunity.impactValue).toBe(390);
    expect(opportunity.periodStart).toBe('2026-01-31');
  });

  it('sem custo em 90% da receita, ou poucos dias de venda, não há oportunidade de margem', () => {
    const result = runEngine(
      input({
        products: [product('f', { grossMargin: -0.2, grossProfit: -1800, costCoverage: 0.5 }), product('g', { grossMargin: 0.05, grossProfit: 450, saleDays: 3 })],
      }),
    );
    expect(result.opportunities).toEqual([]);
    expect(result.limitations.join(' ')).toMatch(/1 produto vendido ficou fora das regras de margem/);
  });

  it('impacto pequeno demais é descartado e contado como pouca evidência', () => {
    const result = runEngine(input({ products: [product('h', { grossMargin: 0.199, grossProfit: 1791 })] }));
    expect(result.opportunities).toEqual([]);
    expect(result.limitations.join(' ')).toMatch(/1 sinal não virou oportunidade/);
  });
});

describe('regras de estoque', () => {
  const inventory = (positions: InventoryPosition[], totalValue = 20000) => ({ asOf: '2026-03-31', positions, totalValue, soldWithoutPosition: 0 });

  it('item parado: impacto em capital, nunca somado ao lucro; perecível sobe a prioridade', () => {
    const stalled = position('s', { status: 'stalled', stockValue: 1000, daysSinceLastSale: 75, avgDailyUnits: 0, coverageDays: null });
    const result = runEngine(input({ inventory: inventory([stalled, { ...stalled, productId: 'p', sku: 'P', name: 'Leite', perishable: true }]) }));
    const regular = byKey(result)['stalled_stock:product:s']!;
    expect(regular).toMatchObject({ impactKind: 'capital', impactValue: 1000, priority: 'medium' });
    // 1.000 / 20.000 = 5% → média; perecível → alta
    expect(byKey(result)['stalled_stock:product:p']!.priority).toBe('high');
  });

  it('capital em excesso: (estoque − cobertura-alvo × venda diária) × custo', () => {
    const excess = position('x', { onHand: 200, coverageDays: 200, avgDailyUnits: 1, stockValue: 2000 });
    const opportunity = byKey(runEngine(input({ inventory: inventory([excess]) })))['tied_up_capital:product:x']!;
    // (200 − 45 × 1) × 10 = 1.550
    expect(opportunity.impactValue).toBe(1550);
    expect(opportunity.impactKind).toBe('capital');
  });

  it('ruptura: lucro em risco = venda diária × prazo × lucro por unidade; pedido sugerido', () => {
    const empty = position('r', { status: 'rupture', onHand: 0, stockValue: 0, avgDailyUnits: 2, coverageDays: 0, leadTimeDays: 7 });
    const metrics = product('r', { grossProfit: 900, unitsSold: 180 });
    const opportunity = byKey(runEngine(input({ products: [metrics], inventory: inventory([empty]) })))['rupture_risk:product:r']!;
    // 2 × 7 × (900 / 180)
    expect(opportunity.impactValue).toBe(70);
    expect(opportunity.impactKind).toBe('one_off_profit');
    expect(opportunity.recommendations[0]).toMatch(/cerca de 104 unidades/);
    // produto entre os 20% de maior lucro → no mínimo alta
    expect(opportunity.priority).toBe('high');
  });

  it('risco de ruptura sem custo: emitido com impacto zero e método explicando', () => {
    const risky = position('k', { status: 'rupture-risk', onHand: 3, avgDailyUnits: 1, coverageDays: 3, leadTimeDays: 10 });
    const opportunity = byKey(runEngine(input({ inventory: inventory([risky]) })))['rupture_risk:product:k']!;
    expect(opportunity.impactValue).toBe(0);
    expect(opportunity.impactMethod).toMatch(/não foi estimado/);
  });

  it('posição de estoque velha demais: ruptura não avaliada, com limitação', () => {
    const old = position('o', { status: 'rupture', onHand: 0, snapshotDate: '2026-02-01' });
    const result = runEngine(input({ inventory: inventory([old]) }));
    expect(result.opportunities).toEqual([]);
    expect(result.limitations.join(' ')).toMatch(/mais de 30 dias/);
  });
});

describe('queda de desempenho', () => {
  it('queda ≥ limite com base relevante; hipóteses vindas dos dados ficam separadas dos fatos', () => {
    const previous = product('q', { netRevenue: 3000, grossProfit: 900, saleDays: 20 });
    const current = product('q', { netRevenue: 1000, grossProfit: 300, averagePrice: 11, saleDays: 8 });
    const comparison = {
      current: { start: '2026-03-02', end: '2026-03-31', days: 30 },
      previous: { start: '2026-01-31', end: '2026-03-01', days: 30 },
      currentProducts: [current],
      previousProducts: [previous],
    };
    const result = runEngine(input({ comparison, inventory: { asOf: '2026-03-31', positions: [position('q', { status: 'no-stock', onHand: 0 })], totalValue: 1, soldWithoutPosition: 0 } }));
    const opportunity = byKey(result)['performance_drop:product:q']!;
    expect(opportunity.impactValue).toBe(600);
    expect(opportunity.facts.find((fact) => fact.label === 'Variação')!.value).toBeCloseTo(-2 / 3, 10);
    expect(opportunity.hypotheses[0]).toMatch(/Estoque zerado/);
    expect(opportunity.hypotheses.some((h) => h.includes('preço médio cobrado subiu'))).toBe(true);
  });
});

describe('motor como um todo', () => {
  it('sem dados: nenhuma oportunidade e as limitações dizem por quê', () => {
    const result = runEngine(input({ window: null, totals: null, dataThrough: null, firstSale: null }));
    expect(result.opportunities).toEqual([]);
    expect(result.limitations).toEqual([
      'Sem vendas importadas: margem, descontos, ruptura e queda de vendas não foram avaliados.',
      'Sem posição de estoque: itens parados, capital em excesso e ruptura não foram avaliados.',
    ]);
  });

  it('é determinístico e ordena por prioridade, confiança, impacto e chave', () => {
    const data = input({
      products: [product('b', { grossMargin: 0.1, grossProfit: 900 }), product('a', { grossProfit: -300, grossMargin: -0.03 }), product('z', { grossMargin: 0.15, grossProfit: 1350 })],
    });
    const first = runEngine(data);
    expect(runEngine(data)).toEqual(first);
    expect(first.opportunities.map((o) => `${o.priority}:${o.dedupeKey}`)).toEqual([
      'critical:low_margin:product:b',
      'high:negative_margin:product:a',
      'high:low_margin:product:z',
    ]);
  });

  it('confiança baixa nunca chega a crítica', () => {
    const scale = { monthlyGrossProfit: 1000, monthlyNetRevenue: 5000, stockValue: null };
    expect(priorityFor('monthly_profit', 500, scale, 0.9)).toBe('critical');
    expect(priorityFor('monthly_profit', 500, scale, 0.55)).toBe('high');
    // sem lucro conhecido, usa a receita: 500 / 5.000 = 10%
    expect(priorityFor('monthly_profit', 500, { ...scale, monthlyGrossProfit: null }, 0.9)).toBe('critical');
  });
});

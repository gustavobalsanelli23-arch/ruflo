// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildBriefing } from '@/lib/analytics/briefing';
import {
  buildCategories,
  buildCoverage,
  buildInventorySnapshot,
  buildMarginPoints,
  buildTrend,
  marginBand,
  summarizeOpportunities,
  type DailyLike,
} from '@/lib/analytics/dashboard';
import type { Opportunity } from '@/lib/data/types';
import type { InventoryPosition, PeriodTotals } from '@/lib/intelligence/types';
import { resolvePeriod } from '@/lib/period';
import { toDbStatus, toOpportunity, toUiStatus } from '@/modules/opportunities/mapping';
import type { OpportunityRow } from '@/types/database-analytics';

/**
 * What the real screens do with the metric layer's numbers: grouping,
 * comparison and labelling only. No figure is recomputed here, and what is
 * unknown stays unknown (null), never zero.
 */

const day = (date: string, netRevenue: number, costedNetRevenue: number, grossProfit: number, orders = 1): DailyLike => ({
  day: date,
  netRevenue,
  costedNetRevenue,
  grossProfit,
  orders,
});

describe('evolução no tempo', () => {
  it('compara cada dia com o mesmo dia do período anterior, e a margem usa só a receita com custo', () => {
    const period = resolvePeriod('7d', '2026-03-10');
    expect(period.start).toBe('2026-03-04');
    expect(period.previousStart).toBe('2026-02-25');
    const { trend, marginTrend } = buildTrend([day('2026-03-04', 100, 80, 30), day('2026-02-25', 70, 70, 20), day('2026-03-10', 50, 0, 0)], period);
    expect(trend).toHaveLength(7);
    expect(trend[0]).toEqual({ date: '2026-03-04', revenue: 100, grossProfit: 30, previousRevenue: 70, orders: 1 });
    expect(marginTrend[0]).toEqual(expect.objectContaining({ revenue: 80, previousRevenue: 70 }));
    expect(trend[6]).toEqual(expect.objectContaining({ revenue: 50, previousRevenue: 0 }));
    expect(trend.slice(1, 6).every((point) => point.revenue === 0)).toBe(true);
  });

  it('margem mensal sem receita com custo fica indisponível, não zero', () => {
    const points = buildMarginPoints([day('2026-03-02', 200, 100, 25), day('2026-02-10', 90, 0, 0)], '2026-03-10');
    expect(points.find((point) => point.date === '2026-03-01')).toEqual({ date: '2026-03-01', margin: 0.25, previousMargin: null });
    expect(points.find((point) => point.date === '2026-02-01')).toBeUndefined();
  });
});

describe('agrupamentos e faixas', () => {
  it('faixa de margem: sem custo é desconhecida, não saudável', () => {
    expect(marginBand(null, 0.2)).toBe('unknown');
    expect(marginBand(-0.01, 0.2)).toBe('negative');
    expect(marginBand(0.19, 0.2)).toBe('low');
    expect(marginBand(0.2, 0.2)).toBe('healthy');
  });

  it('categorias: participação sobre a receita líquida, sem categoria rotulado, margem anterior ausente fica nula', () => {
    const rows = buildCategories(
      [
        { id: 'c1', name: 'Mercearia', netRevenue: 300, grossProfit: 60, grossMargin: 0.2, products: 4 },
        { id: null, name: null, netRevenue: 100, grossProfit: 0, grossMargin: null, products: 1 },
      ],
      [{ id: 'c1', name: 'Mercearia', netRevenue: 250, grossProfit: 40, grossMargin: 0.16, products: 4 }],
    );
    expect(rows[0]).toEqual(expect.objectContaining({ categoryId: 'c1', share: 0.75, previousRevenue: 250, previousMargin: 0.16 }));
    expect(rows[1]).toEqual(expect.objectContaining({ categoryId: 'sem-categoria', name: 'Sem categoria', margin: null, previousMargin: null, share: 0.25 }));
  });

  it('cobertura: todas as faixas na ordem, vazias com zero', () => {
    const coverage = buildCoverage([{ bucket: 'Sem venda', products: 2, value: 900 }]);
    expect(coverage.map((row) => row.bucket)).toEqual(['Até 7 dias', '8 a 30 dias', '31 a 60 dias', '61 a 120 dias', 'Mais de 120 dias', 'Sem venda']);
    expect(coverage.at(-1)).toEqual({ bucket: 'Sem venda', skuCount: 2, stockValue: 900 });
  });
});

describe('estoque', () => {
  const position = (overrides: Partial<InventoryPosition>): InventoryPosition => ({
    productId: 'p',
    sku: 'P',
    name: 'Produto',
    categoryName: null,
    supplierName: null,
    perishable: null,
    snapshotDate: '2026-03-10',
    snapshotAgeDays: 0,
    onHand: 10,
    unitCost: 5,
    costSource: 'catalog',
    stockValue: 50,
    windowDays: 90,
    historyDays: 90,
    unitsWindow: 90,
    avgDailyUnits: 1,
    coverageDays: 10,
    annualTurnover: 36.5,
    lastSaleDate: '2026-03-09',
    daysSinceLastSale: 1,
    leadTimeDays: 7,
    status: 'medium-turnover',
    ...overrides,
  });

  it('cobertura média = valor do estoque ÷ CMV diário da janela; sem CMV não há cobertura', () => {
    const totals = {
      products: 4,
      stockValue: 9000,
      windowDays: 90,
      byStatus: [
        { status: 'stalled', products: 1, value: 2000 },
        { status: 'high-turnover', products: 2, value: 3000 },
        { status: 'rupture', products: 1, value: 0 },
      ],
    };
    const snapshot = buildInventorySnapshot(totals, 27000, [
      position({ productId: 'a', status: 'rupture-risk', coverageDays: 4 }),
      position({ productId: 'b', status: 'rupture', coverageDays: null, onHand: 0 }),
      position({ productId: 'c', status: 'stalled' }),
    ]);
    expect(snapshot.averageCoverageDays).toBe(30);
    expect(snapshot).toEqual(expect.objectContaining({ stalledValue: 2000, stalledCount: 1, ruptureRiskCount: 1, healthyShare: 0.5 }));
    expect(snapshot.ruptureItems.map((item) => [item.productId, item.coverageDays])).toEqual([
      ['b', 0],
      ['a', 4],
    ]);
    expect(buildInventorySnapshot(totals, null, []).averageCoverageDays).toBe(0);
  });
});

describe('oportunidades', () => {
  const row = (overrides: Partial<OpportunityRow> = {}): OpportunityRow => ({
    id: 'o1',
    organization_id: 'org',
    type: 'tied_up_capital',
    dedupe_key: 'tied_up_capital:p1',
    entity_type: 'product',
    entity_id: 'p1',
    entity_label: 'Azeite 500 ml',
    title: 'Capital parado em Azeite 500 ml',
    summary: 'O estoque cobre 210 dias de vendas.',
    priority: 'medium',
    confidence: 0.8,
    impact_value: 1234.5,
    impact_kind: 'capital',
    impact_method: '(estoque − cobertura-alvo) × custo unitário.',
    facts: [
      { label: 'Cobertura', value: 210, format: 'days', source: 'Posição de estoque de 10/03/2026' },
      { label: 'Custo unitário', value: 18.9, format: 'currency', source: 'Cadastro de produtos' },
      'não é um fato',
    ],
    hypotheses: ['Compra acima do giro.', 42],
    recommendations: ['Reduzir a próxima compra.'],
    series: null,
    period_start: '2025-12-11',
    period_end: '2026-03-10',
    status: 'in_progress',
    active: true,
    detected_count: 2,
    first_detected_at: '2026-03-01T12:00:00Z',
    last_detected_at: '2026-03-10T12:00:00Z',
    last_run_id: null,
    status_changed_at: null,
    status_changed_by: null,
    created_at: '2026-03-01T12:00:00Z',
    updated_at: '2026-03-10T12:00:00Z',
    ...overrides,
  });

  it('status ida e volta entre banco e interface', () => {
    for (const status of ['new', 'reviewing', 'in_progress', 'resolved', 'dismissed'] as const) expect(toDbStatus(toUiStatus(status))).toBe(status);
  });

  it('fatos viram evidência com fonte; hipóteses ficam separadas; capital não vira lucro', () => {
    const item = toOpportunity(row(), [
      { opportunity_id: 'o1', event: 'detected', to_status: 'new', note: null, created_at: '2026-03-01T12:00:00Z', actor: null },
      { opportunity_id: 'o1', event: 'status_changed', to_status: 'in_progress', note: 'Falar com o fornecedor', created_at: '2026-03-02T12:00:00Z', actor: 'Ana' },
    ]);
    expect(item.status).toBe('in-progress');
    expect(item.impactKind).toBe('capital');
    expect(item.category).toBe('inventory');
    expect(item.evidence).toEqual([
      { label: 'Cobertura', value: '210 dias', detail: 'Posição de estoque de 10/03/2026', basis: 'fact' },
      { label: 'Custo unitário', value: expect.stringContaining('18,90'), detail: 'Cadastro de produtos', basis: 'fact' },
    ]);
    expect(item.hypotheses).toEqual(['Compra acima do giro.']);
    expect(item.assumptions).toEqual(['(estoque − cobertura-alvo) × custo unitário.']);
    expect(item.history?.map((event) => event.label)).toEqual(['Detectada pela análise', 'Status alterado para "Em andamento"']);

    const summary = summarizeOpportunities([
      item,
      toOpportunity(row({ id: 'o2', impact_kind: 'monthly_profit', impact_value: 300, priority: 'critical', status: 'new' })),
      toOpportunity(row({ id: 'o3', impact_kind: 'monthly_profit', impact_value: 999, status: 'dismissed' })),
    ]);
    expect(summary.summary).toEqual({ open: 2, highPriority: 1, monthlyImpact: 300, oneOffImpact: 0, capitalImpact: 1234.5 });
    expect(summary.top.map((top: Opportunity) => top.id)).toEqual(['o2', 'o1']);
  });
});

describe('abertura da visão geral', () => {
  const totals = (overrides: Partial<PeriodTotals> = {}): PeriodTotals => ({
    grossRevenue: 0,
    discounts: 0,
    returns: 0,
    netRevenue: 0,
    costedNetRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMargin: null,
    costCoverage: null,
    orders: 0,
    averageTicket: null,
    unitsSold: 0,
    saleLines: 0,
    activeDays: 0,
    catalogCostLines: 0,
    uncostedLines: 0,
    ...overrides,
  });
  const text = (segments: { text: string }[]) => segments.map((segment) => segment.text).join('');

  it('sem período anterior não inventa variação; sem custo diz que a margem está indisponível', () => {
    const sentence = text(
      buildBriefing({ period: '30d', current: totals({ netRevenue: 1000 }), previous: totals(), openOpportunities: 0, urgentOpportunities: 0 }),
    );
    expect(sentence).not.toContain('em relação ao período anterior');
    expect(sentence).toContain('Margem bruta indisponível');
    expect(sentence).toContain('Nenhuma oportunidade aberta com evidência suficiente.');
  });

  it('margem calculada sobre parte da receita diz qual parte', () => {
    const sentence = text(
      buildBriefing({
        period: '30d',
        current: totals({ netRevenue: 1000, grossMargin: 0.3, costCoverage: 0.8, returns: 50 }),
        previous: totals({ netRevenue: 800 }),
        openOpportunities: 3,
        urgentOpportunities: 1,
      }),
    );
    expect(sentence).toContain('+25');
    expect(sentence).toContain('calculada sobre 80% da receita');
    expect(sentence).toContain('Devoluções somam');
    expect(sentence).toContain('3 oportunidades abertas, 1 de prioridade alta ou crítica.');
  });
});

import { describe, expect, it } from 'vitest';
import { demoRepository } from '@/demo/repository';

/**
 * The demo exists to evaluate the interface, so its numbers must agree with
 * each other across screens: totals are sums of the same product rows.
 */
describe('demo dataset coherence', () => {
  const repository = demoRepository;

  it('is flagged as a demonstration workspace', async () => {
    const workspace = await repository.getWorkspace();
    expect(workspace.organization.isDemo).toBe(true);
    expect(workspace.user.email.endsWith('.example')).toBe(true);
  });

  it('overview totals match the category and trend breakdowns', async () => {
    for (const key of ['7d', '30d', '90d', '12m', 'ytd'] as const) {
      const overview = await repository.getOverview(key);
      const byCategory = overview.categories.reduce((sum, c) => sum + c.revenue, 0);
      const byTrend = overview.trend.reduce((sum, p) => sum + p.revenue, 0);
      expect(byCategory).toBeCloseTo(overview.revenue.value, 2);
      expect(byTrend).toBeCloseTo(overview.revenue.value, 2);
      expect(overview.grossMargin.value).toBeCloseTo(overview.grossProfit.value / overview.revenue.value, 6);
      expect(overview.categories.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1, 6);
    }
  });

  it('profit analytics agree with the overview for the same period', async () => {
    const [overview, profit] = await Promise.all([repository.getOverview('30d'), repository.getProfitAnalytics('30d')]);
    expect(profit.grossProfit.value).toBeCloseTo(overview.grossProfit.value, 2);
    expect(profit.products.reduce((sum, p) => sum + p.grossProfit, 0)).toBeCloseTo(profit.grossProfit.value, 2);
    expect(profit.negativeMarginCount).toBe(profit.products.filter((p) => (p.margin ?? 0) < 0).length);
  });

  it('overview diagnostics agree with the opportunity and inventory screens', async () => {
    const [overview, opportunities, inventory] = await Promise.all([
      repository.getOverview('30d'),
      repository.getOpportunities(),
      repository.getInventory(),
    ]);
    const open = opportunities.filter((o) => o.status !== 'done' && o.status !== 'dismissed');
    expect(overview.opportunitySummary.open).toBe(open.length);
    expect(overview.opportunitySummary.monthlyImpact).toBe(open.filter((o) => o.impactKind === 'monthly').reduce((s, o) => s + o.impact, 0));
    expect(overview.inventory.ruptureItems).toHaveLength(inventory.ruptureRiskCount);
  });

  it('inventory value is the sum of product positions', async () => {
    const inventory = await repository.getInventory();
    expect(inventory.products.reduce((sum, p) => sum + p.stockValue, 0)).toBeCloseTo(inventory.stockValue, 2);
    expect(inventory.coverage.reduce((sum, b) => sum + b.skuCount, 0)).toBe(inventory.products.length);
    expect(inventory.immobilizedValue).toBeLessThan(inventory.stockValue);
  });

  it('opportunities are ranked, open ones first, with positive impact', async () => {
    const opportunities = await repository.getOpportunities();
    expect(opportunities.length).toBeGreaterThan(0);
    for (const op of opportunities) {
      expect(op.impact).toBeGreaterThan(0);
      expect(op.confidence).toBeGreaterThan(0);
      expect(op.confidence).toBeLessThanOrEqual(1);
      expect(op.recommendation.length).toBeGreaterThan(0);
      expect(op.finding.length, op.id).toBeGreaterThan(0);
      expect(op.whyItMatters.length, op.id).toBeGreaterThan(0);
      expect(op.assumptions.length, `${op.id} explains its estimate`).toBeGreaterThan(0);
      expect(op.evidence.some((e) => e.basis !== 'estimate'), `${op.id} has a verified fact`).toBe(true);
    }
    const closedIndex = opportunities.findIndex((o) => o.status === 'done' || o.status === 'dismissed');
    expect(opportunities.slice(closedIndex).every((o) => o.status === 'done' || o.status === 'dismissed')).toBe(true);
  });

  it('every analyst suggestion has a scripted answer that separates facts and hypotheses', async () => {
    const analyst = await repository.getAnalyst();
    for (const suggestion of analyst.suggestions) {
      const blocks = analyst.scriptedAnswers[suggestion.id];
      expect(blocks, suggestion.id).toBeDefined();
      expect(blocks?.some((b) => b.kind === 'findings')).toBe(true);
      expect(blocks?.some((b) => b.kind === 'sources')).toBe(true);
      expect(blocks?.some((b) => b.kind === 'recommendation')).toBe(true);
      for (const block of blocks ?? []) {
        if (block.kind !== 'table') continue;
        for (const row of block.rows) for (const column of block.columns) expect(row[column.key], `${suggestion.id}:${column.key}`).toBeDefined();
      }
    }
  });

  it('the sample import maps every required field', async () => {
    const hub = await repository.getDataHub();
    const mapped = new Set(hub.sample.mapping.map((m) => m.target));
    for (const field of hub.targetFields.filter((f) => f.required)) expect(mapped.has(field.id), field.id).toBe(true);
  });
});

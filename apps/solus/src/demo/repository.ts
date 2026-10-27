/**
 * DEMONSTRATION repository. Implements SolusRepository over fictitious data.
 * Replaced in Phase 02 by an implementation scoped to the signed-in
 * organization; screens keep calling the same methods.
 */
import type { SolusRepository } from '@/lib/data/repository';
import type { BriefingSegment, Comparison, OverviewData, ProfitData } from '@/lib/data/types';
import { formatCurrency, formatPercent, formatPoints, formatSignedPercent, relativeChange } from '@/lib/format';
import { resolvePeriod } from '@/lib/period';
import { analyst } from './analyst';
import { DEMO_TODAY } from './catalog';
import { dataHub } from './data-hub';
import {
  LOW_MARGIN_THRESHOLD,
  categoryPerformance,
  inventory,
  margin,
  marginTrend,
  productProfit,
  supplierProfit,
  trendSeries,
} from './metrics';
import { opportunities } from './opportunities';
import { activity, currentUser, members, organization, permissions } from './organization';
import { ordersFor, storeTotals } from './sales';

function briefing(revenue: Comparison, grossMargin: Comparison, periodLabel: string): BriefingSegment[] {
  const change = relativeChange(revenue.value, revenue.previous) ?? 0;
  const marginDelta = grossMargin.value - grossMargin.previous;
  const open = opportunities().filter((o) => o.priority === 'high' && o.status !== 'done' && o.status !== 'dismissed');
  const monthly = open.filter((o) => o.impactKind === 'monthly').reduce((sum, o) => sum + o.impact, 0);
  const marginWord = Math.abs(marginDelta) < 0.0015 ? 'ficou estável em' : marginDelta > 0 ? 'subiu para' : 'caiu para';
  return [
    { kind: 'text', text: `${periodLabel}: receita de ` },
    { kind: 'figure', text: formatCurrency(revenue.value, { compact: true }) },
    { kind: 'text', text: ', ' },
    {
      kind: 'figure',
      text: `${formatSignedPercent(change)} sobre o período anterior`,
      tone: change > 0.002 ? 'positive' : change < -0.002 ? 'negative' : 'neutral',
    },
    { kind: 'text', text: `. A margem bruta ${marginWord} ` },
    { kind: 'figure', text: formatPercent(grossMargin.value) },
    {
      kind: 'text',
      text: Math.abs(marginDelta) < 0.0015 ? '. ' : ` (${formatPoints(marginDelta)}). `,
    },
    { kind: 'figure', text: `${open.length} oportunidades de alta prioridade`, tone: 'neutral' },
    { kind: 'text', text: ' somam ' },
    { kind: 'figure', text: `${formatCurrency(monthly, { whole: true })} por mês` },
    { kind: 'text', text: ', lideradas pelo reajuste de custos da Laticínios Boa Vista.' },
  ];
}

export const demoRepository: SolusRepository = {
  async getWorkspace() {
    return {
      organization,
      user: currentUser,
      dataThrough: DEMO_TODAY,
      openOpportunities: opportunities().filter((o) => o.status !== 'done' && o.status !== 'dismissed').length,
    };
  },

  async getOverview(key) {
    const period = resolvePeriod(key, DEMO_TODAY);
    const now = storeTotals(period.start, period.end);
    const before = storeTotals(period.previousStart, period.previousEnd);
    const ordersNow = ordersFor(now.units);
    const ordersBefore = ordersFor(before.units);
    const revenue = { value: now.revenue, previous: before.revenue };
    const grossMargin = { value: margin(now.revenue, now.cost), previous: margin(before.revenue, before.cost) };
    const inv = inventory();
    const overview: OverviewData = {
      period,
      briefing: briefing(revenue, grossMargin, period.label),
      revenue,
      grossProfit: { value: now.revenue - now.cost, previous: before.revenue - before.cost },
      grossMargin,
      averageTicket: {
        value: ordersNow > 0 ? now.revenue / ordersNow : 0,
        previous: ordersBefore > 0 ? before.revenue / ordersBefore : 0,
      },
      orders: { value: ordersNow, previous: ordersBefore },
      trend: trendSeries(period),
      categories: categoryPerformance(period),
      inventory: {
        stockValue: inv.stockValue,
        averageCoverageDays: inv.averageCoverageDays,
        ruptureRiskCount: inv.ruptureRiskCount,
        stalledValue: inv.products.filter((p) => p.status === 'stalled').reduce((s, p) => s + p.stockValue, 0),
        stalledCount: inv.stalledCount,
        skuCount: inv.products.length,
        healthyShare: inv.products.filter((p) => p.status === 'healthy').length / inv.products.length,
      },
      topOpportunities: opportunities()
        .filter((o) => o.status !== 'done' && o.status !== 'dismissed')
        .sort((a, b) => rank(b) - rank(a))
        .slice(0, 3),
      activity,
    };
    return overview;
  },

  async getProfitAnalytics(key) {
    const period = resolvePeriod(key, DEMO_TODAY);
    const now = storeTotals(period.start, period.end);
    const before = storeTotals(period.previousStart, period.previousEnd);
    const items = productProfit(period);
    const data: ProfitData = {
      period,
      lowMarginThreshold: LOW_MARGIN_THRESHOLD,
      revenue: { value: now.revenue, previous: before.revenue },
      grossProfit: { value: now.revenue - now.cost, previous: before.revenue - before.cost },
      grossMargin: { value: margin(now.revenue, now.cost), previous: margin(before.revenue, before.cost) },
      lowMarginCount: items.filter((p) => p.band === 'low').length,
      negativeMarginCount: items.filter((p) => p.band === 'negative').length,
      marginTrend: marginTrend(DEMO_TODAY),
      categories: categoryPerformance(period),
      suppliers: supplierProfit(period),
      products: items,
    };
    return data;
  },

  async getInventory() {
    return inventory();
  },

  async getOpportunities() {
    return [...opportunities()].sort((a, b) => rank(b) - rank(a));
  },

  async getAnalyst() {
    return analyst();
  },

  async getDataHub() {
    return dataHub;
  },

  async getSettings() {
    return { organization, user: currentUser, members, permissions };
  },
};

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;

/** Ranks by priority, then by expected monthly value (one-off impacts spread over a year). */
function rank(o: ReturnType<typeof opportunities>[number]): number {
  const monthly = o.impactKind === 'monthly' ? o.impact : o.impact / 12;
  const closed = o.status === 'done' || o.status === 'dismissed' ? -1_000_000_000 : 0;
  return closed + PRIORITY_WEIGHT[o.priority] * 1_000_000 + monthly * o.confidence;
}

import type {
  CategoryPerformance,
  CoverageBucket,
  InventorySnapshot,
  MarginBand,
  MarginPoint,
  Opportunity,
  OpportunitySummary,
  Period,
  ProductProfit,
  ProductStock,
  StockStatus,
  SupplierProfit,
  TrendPoint,
} from '@/lib/data/types';
import type { InventoryPosition, ProductMetrics } from '@/lib/intelligence/types';
import { addDays, buckets, daysBetween } from '@/lib/period';

/**
 * Pure builders: metric-layer rows → the shapes the existing screens render.
 * No number is computed here that the SQL layer does not already provide;
 * they are only summed per bucket, grouped or relabeled.
 */

export interface DailyLike {
  day: string;
  netRevenue: number;
  costedNetRevenue: number;
  grossProfit: number;
  orders: number;
}

function sumBucket(daily: Map<string, DailyLike>, start: string, end: string) {
  const total = { revenue: 0, costed: 0, profit: 0, orders: 0 };
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const point = daily.get(day);
    if (!point) continue;
    total.revenue += point.netRevenue;
    total.costed += point.costedNetRevenue;
    total.profit += point.grossProfit;
    total.orders += point.orders;
  }
  return total;
}

/**
 * Revenue and gross profit per bucket against the same bucket of the previous
 * period. `marginTrend` carries the revenue with known cost, so the margin
 * chart (profit ÷ revenue) is not diluted by sales without cost.
 */
export function buildTrend(points: DailyLike[], period: Period): { trend: TrendPoint[]; marginTrend: TrendPoint[] } {
  const daily = new Map(points.map((point) => [point.day, point]));
  const offset = daysBetween(period.previousStart, period.start) - 1;
  const trend: TrendPoint[] = [];
  const marginTrend: TrendPoint[] = [];
  for (const bucket of buckets(period.start, period.end, period.granularity)) {
    const now = sumBucket(daily, bucket.start, bucket.end);
    const before = sumBucket(daily, addDays(bucket.start, -offset), addDays(bucket.end, -offset));
    trend.push({ date: bucket.start, revenue: now.revenue, grossProfit: now.profit, previousRevenue: before.revenue, orders: now.orders });
    marginTrend.push({ date: bucket.start, revenue: now.costed, grossProfit: now.profit, previousRevenue: before.costed, orders: now.orders });
  }
  return { trend, marginTrend };
}

/** Monthly margin of the last 12 months against the same month one year earlier. */
export function buildMarginPoints(points: DailyLike[], end: string): MarginPoint[] {
  const daily = new Map(points.map((point) => [point.day, point]));
  const margin = (total: { costed: number; profit: number }) => (total.costed > 0 ? total.profit / total.costed : null);
  return buckets(addDays(end, -364), end, 'month')
    .slice(-12)
    .map((bucket) => ({
      date: bucket.start,
      margin: margin(sumBucket(daily, bucket.start, bucket.end)),
      previousMargin: margin(sumBucket(daily, addDays(bucket.start, -365), addDays(bucket.end, -365))),
    }))
    .filter((point) => point.margin !== null || point.previousMargin !== null);
}

export interface GroupLike {
  id: string | null;
  name: string | null;
  netRevenue: number;
  grossProfit: number;
  grossMargin: number | null;
  products: number;
}

export function buildCategories(current: GroupLike[], previous: GroupLike[]): CategoryPerformance[] {
  const total = current.reduce((sum, group) => sum + group.netRevenue, 0);
  const before = new Map(previous.map((group) => [group.id ?? 'sem-categoria', group]));
  return current.map((group) => {
    const key = group.id ?? 'sem-categoria';
    const past = before.get(key);
    return {
      categoryId: key,
      name: group.name ?? 'Sem categoria',
      revenue: group.netRevenue,
      previousRevenue: past?.netRevenue ?? 0,
      grossProfit: group.grossProfit,
      margin: group.grossMargin,
      previousMargin: past?.grossMargin ?? null,
      share: total > 0 ? group.netRevenue / total : 0,
    };
  });
}

export function marginBand(margin: number | null, minimum: number): MarginBand {
  if (margin === null) return 'unknown';
  if (margin < 0) return 'negative';
  if (margin < minimum) return 'low';
  return 'healthy';
}

export function buildProductProfit(current: ProductMetrics[], previous: ProductMetrics[], minimum: number): ProductProfit[] {
  const before = new Map(previous.map((product) => [product.productId, product]));
  return current.map((product) => {
    const past = before.get(product.productId);
    return {
      productId: product.productId,
      sku: product.sku,
      name: product.name,
      category: product.categoryName ?? 'Sem categoria',
      supplier: product.supplierName ?? 'Sem fornecedor',
      unitsSold: product.unitsSold,
      revenue: product.netRevenue,
      previousRevenue: past?.netRevenue ?? 0,
      grossProfit: product.grossProfit,
      margin: product.grossMargin,
      previousMargin: past?.grossMargin ?? null,
      band: marginBand(product.grossMargin, minimum),
    };
  });
}

export function buildSuppliers(groups: GroupLike[]): SupplierProfit[] {
  return groups.map((group) => ({
    supplierId: group.id ?? 'sem-fornecedor',
    name: group.name ?? 'Sem fornecedor',
    revenue: group.netRevenue,
    grossProfit: group.grossProfit,
    margin: group.grossMargin,
    productCount: group.products,
  }));
}

export function toProductStock(position: InventoryPosition): ProductStock {
  return {
    productId: position.productId,
    sku: position.sku,
    name: position.name,
    category: position.categoryName ?? 'Sem categoria',
    onHand: position.onHand,
    stockValue: position.stockValue ?? 0,
    costKnown: position.unitCost !== null,
    dailyUnits: position.avgDailyUnits ?? 0,
    coverageDays: position.coverageDays,
    turnover: position.annualTurnover,
    leadTimeDays: position.leadTimeDays,
    daysSinceLastSale: position.daysSinceLastSale,
    perishable: position.perishable ?? false,
    status: position.status as StockStatus,
  };
}

export const COVERAGE_ORDER = ['Até 7 dias', '8 a 30 dias', '31 a 60 dias', '61 a 120 dias', 'Mais de 120 dias', 'Sem venda'];

export function buildCoverage(rows: { bucket: string; products: number; value: number }[]): CoverageBucket[] {
  const byLabel = new Map(rows.map((row) => [row.bucket, row]));
  return COVERAGE_ORDER.map((bucket) => ({ bucket, skuCount: byLabel.get(bucket)?.products ?? 0, stockValue: byLabel.get(bucket)?.value ?? 0 }));
}

const HEALTHY = new Set(['healthy', 'high-turnover', 'medium-turnover']);

export function buildInventorySnapshot(
  totals: { products: number; stockValue: number; windowDays: number | null; byStatus: { status: string; products: number; value: number }[] },
  windowCogs: number | null,
  urgent: InventoryPosition[],
): InventorySnapshot {
  const count = (status: string) => totals.byStatus.find((item) => item.status === status)?.products ?? 0;
  const value = (status: string) => totals.byStatus.find((item) => item.status === status)?.value ?? 0;
  const dailyCost = windowCogs !== null && totals.windowDays ? windowCogs / totals.windowDays : 0;
  const healthy = totals.byStatus.filter((item) => HEALTHY.has(item.status)).reduce((sum, item) => sum + item.products, 0);
  return {
    stockValue: totals.stockValue,
    averageCoverageDays: dailyCost > 0 ? totals.stockValue / dailyCost : 0,
    ruptureRiskCount: count('rupture') + count('rupture-risk'),
    stalledValue: value('stalled'),
    stalledCount: count('stalled'),
    skuCount: totals.products,
    healthyShare: totals.products > 0 ? healthy / totals.products : 0,
    ruptureItems: urgent
      .filter((position) => position.status === 'rupture' || position.status === 'rupture-risk')
      .sort((a, b) => (a.coverageDays ?? 0) - (b.coverageDays ?? 0))
      .slice(0, 5)
      .map((position) => ({
        productId: position.productId,
        name: position.name,
        coverageDays: position.status === 'rupture' ? 0 : (position.coverageDays ?? 0),
        leadTimeDays: position.leadTimeDays,
      })),
  };
}

const OPEN = new Set(['new', 'reviewing', 'in-progress']);
const RANK = { critical: 4, high: 3, medium: 2, low: 1 } as const;

export function summarizeOpportunities(items: Opportunity[]): { summary: OpportunitySummary; top: Opportunity[] } {
  const open = items.filter((item) => OPEN.has(item.status));
  const sum = (kind: Opportunity['impactKind']) => open.filter((item) => item.impactKind === kind).reduce((total, item) => total + item.impact, 0);
  return {
    summary: {
      open: open.length,
      highPriority: open.filter((item) => item.priority === 'high' || item.priority === 'critical').length,
      monthlyImpact: sum('monthly'),
      oneOffImpact: sum('one-off'),
      capitalImpact: sum('capital'),
    },
    top: [...open].sort((a, b) => RANK[b.priority] - RANK[a.priority] || b.confidence - a.confidence || b.impact - a.impact).slice(0, 3),
  };
}

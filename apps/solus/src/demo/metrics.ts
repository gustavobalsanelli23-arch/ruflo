/**
 * DEMONSTRATION DATA — display aggregations over the generated demo history.
 * These are not the definitive analytical engine (Phase 03+); they only sum
 * demo rows so every screen shows numbers that agree with each other.
 */
import type {
  CategoryPerformance,
  InventoryData,
  MarginBand,
  MarginPoint,
  Period,
  ProductProfit,
  ProductStock,
  StockStatus,
  SupplierProfit,
  TrendPoint,
} from '@/lib/data/types';
import { addDays, daysBetween, fromISODate, toISODate } from '@/lib/period';
import { DEMO_TODAY, categories, categoryName, costOn, products, supplierName, suppliers } from './catalog';
import { lastSaleDate, ordersFor, productTotals, salesHistory, storeTotals } from './sales';

export const LOW_MARGIN_THRESHOLD = 0.15;
export const STALLED_AFTER_DAYS = 60;
export const LOW_TURNOVER_COVERAGE = 120;

export const margin = (revenue: number, cost: number) => (revenue > 0 ? (revenue - cost) / revenue : 0);

function buckets(start: string, end: string, granularity: Period['granularity']): { start: string; end: string }[] {
  const result: { start: string; end: string }[] = [];
  if (granularity === 'day') {
    for (let d = start; d <= end; d = addDays(d, 1)) result.push({ start: d, end: d });
  } else if (granularity === 'week') {
    for (let d = start; d <= end; d = addDays(d, 7)) {
      const e = addDays(d, 6);
      result.push({ start: d, end: e > end ? end : e });
    }
  } else {
    let cursor = start;
    while (cursor <= end) {
      const date = new Date(fromISODate(cursor));
      const monthEnd = toISODate(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
      result.push({ start: cursor, end: monthEnd > end ? end : monthEnd });
      cursor = addDays(monthEnd, 1);
    }
  }
  return result;
}

/** Daily store totals, computed once and reused by every series. */
let dailyCache: { revenue: number[]; cost: number[]; units: number[] } | null = null;
function daily() {
  if (!dailyCache) {
    const history = salesHistory();
    const first = history.values().next().value ?? [];
    const revenue = new Array<number>(first.length).fill(0);
    const cost = new Array<number>(first.length).fill(0);
    const units = new Array<number>(first.length).fill(0);
    for (const rows of history.values()) {
      rows.forEach((row, i) => {
        revenue[i] = (revenue[i] ?? 0) + row.revenue;
        cost[i] = (cost[i] ?? 0) + row.cost;
        units[i] = (units[i] ?? 0) + row.units;
      });
    }
    dailyCache = { revenue, cost, units };
  }
  return dailyCache;
}

function sumRange(values: number[], start: string, end: string): number {
  const historyStart = addDays(DEMO_TODAY, -(values.length - 1));
  const from = Math.max(0, daysBetween(historyStart, start) - 1);
  const to = Math.min(values.length - 1, daysBetween(historyStart, end) - 1);
  let total = 0;
  for (let i = from; i <= to; i += 1) total += values[i] ?? 0;
  return total;
}

export function trendSeries(period: Period): TrendPoint[] {
  const { revenue, cost, units } = daily();
  const current = buckets(period.start, period.end, period.granularity);
  const offset = daysBetween(period.previousStart, period.start) - 1;
  return current.map((bucket) => {
    const r = sumRange(revenue, bucket.start, bucket.end);
    const c = sumRange(cost, bucket.start, bucket.end);
    const previous = sumRange(revenue, addDays(bucket.start, -offset), addDays(bucket.end, -offset));
    const orders = ordersFor(sumRange(units, bucket.start, bucket.end));
    return { date: bucket.start, revenue: r, grossProfit: r - c, previousRevenue: previous, orders };
  });
}

export function marginTrend(end: string, months = 12): MarginPoint[] {
  const { revenue, cost } = daily();
  const start = addDays(end, -364);
  return buckets(start, end, 'month')
    .slice(-months)
    .map((bucket) => {
      const r = sumRange(revenue, bucket.start, bucket.end);
      const c = sumRange(cost, bucket.start, bucket.end);
      const pr = sumRange(revenue, addDays(bucket.start, -365), addDays(bucket.end, -365));
      const pc = sumRange(cost, addDays(bucket.start, -365), addDays(bucket.end, -365));
      return { date: bucket.start, margin: margin(r, c), previousMargin: margin(pr, pc) };
    });
}

export function categoryPerformance(period: Period): CategoryPerformance[] {
  const total = storeTotals(period.start, period.end).revenue;
  return categories
    .map((category) => {
      const ids = products.filter((p) => p.categoryId === category.id).map((p) => p.id);
      const now = storeTotals(period.start, period.end, ids);
      const before = storeTotals(period.previousStart, period.previousEnd, ids);
      return {
        categoryId: category.id,
        name: category.name,
        revenue: now.revenue,
        previousRevenue: before.revenue,
        grossProfit: now.revenue - now.cost,
        margin: margin(now.revenue, now.cost),
        previousMargin: margin(before.revenue, before.cost),
        share: total > 0 ? now.revenue / total : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function bandFor(value: number): MarginBand {
  if (value < 0) return 'negative';
  if (value < LOW_MARGIN_THRESHOLD) return 'low';
  return 'healthy';
}

export function productProfit(period: Period): ProductProfit[] {
  return products
    .map((product) => {
      const now = productTotals(product.id, period.start, period.end);
      const before = productTotals(product.id, period.previousStart, period.previousEnd);
      // Products without sales still show their list margin, so the table never lies about price vs cost.
      const listMargin = margin(product.price, costOn(product, period.end));
      const value = now.revenue > 0 ? margin(now.revenue, now.cost) : listMargin;
      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        category: categoryName(product.categoryId),
        supplier: supplierName(product.supplierId),
        unitsSold: now.units,
        revenue: now.revenue,
        previousRevenue: before.revenue,
        grossProfit: now.revenue - now.cost,
        margin: value,
        previousMargin: before.revenue > 0 ? margin(before.revenue, before.cost) : listMargin,
        band: bandFor(value),
      };
    })
    .sort((a, b) => b.grossProfit - a.grossProfit);
}

export function supplierProfit(period: Period): SupplierProfit[] {
  return suppliers
    .map((supplier) => {
      const ids = products.filter((p) => p.supplierId === supplier.id).map((p) => p.id);
      const t = storeTotals(period.start, period.end, ids);
      return {
        supplierId: supplier.id,
        name: supplier.name,
        revenue: t.revenue,
        grossProfit: t.revenue - t.cost,
        margin: margin(t.revenue, t.cost),
        productCount: ids.length,
      };
    })
    .sort((a, b) => b.grossProfit - a.grossProfit);
}

function statusFor(coverage: number | null, leadTime: number, idleDays: number): StockStatus {
  if (idleDays >= STALLED_AFTER_DAYS) return 'stalled';
  if (coverage !== null && coverage <= leadTime) return 'rupture-risk';
  if (coverage !== null && coverage > LOW_TURNOVER_COVERAGE) return 'low-turnover';
  return 'healthy';
}

export function productStock(asOf = DEMO_TODAY): ProductStock[] {
  const last30 = addDays(asOf, -29);
  const last365 = addDays(asOf, -364);
  return products.map((product) => {
    const units30 = productTotals(product.id, last30, asOf).units;
    const cogs12 = productTotals(product.id, last365, asOf).cost;
    const unitCost = costOn(product, asOf);
    const stockValue = product.onHand * unitCost;
    const dailyUnits = units30 / 30;
    const coverageDays = dailyUnits > 0 ? product.onHand / dailyUnits : null;
    const last = lastSaleDate(product.id);
    const idleDays = last ? daysBetween(last, asOf) - 1 : 365;
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: categoryName(product.categoryId),
      onHand: product.onHand,
      stockValue,
      dailyUnits,
      coverageDays,
      turnover: stockValue > 0 ? cogs12 / stockValue : 0,
      leadTimeDays: product.leadTimeDays,
      daysSinceLastSale: idleDays,
      perishable: product.categoryId === 'padaria' || product.categoryId === 'hortifruti',
      status: statusFor(coverageDays, product.leadTimeDays, idleDays),
    };
  });
}

const COVERAGE_BUCKETS: { label: string; test: (stock: ProductStock) => boolean }[] = [
  { label: 'Até 7 dias', test: (s) => s.coverageDays !== null && s.coverageDays <= 7 },
  { label: '8 a 30 dias', test: (s) => s.coverageDays !== null && s.coverageDays > 7 && s.coverageDays <= 30 },
  { label: '31 a 60 dias', test: (s) => s.coverageDays !== null && s.coverageDays > 30 && s.coverageDays <= 60 },
  { label: '61 a 120 dias', test: (s) => s.coverageDays !== null && s.coverageDays > 60 && s.coverageDays <= 120 },
  { label: 'Mais de 120 dias', test: (s) => s.coverageDays !== null && s.coverageDays > 120 },
  { label: 'Sem venda', test: (s) => s.coverageDays === null },
];

export function inventory(asOf = DEMO_TODAY): InventoryData {
  const stock = productStock(asOf);
  const stockValue = stock.reduce((sum, s) => sum + s.stockValue, 0);
  const cogs30 = storeTotals(addDays(asOf, -29), asOf).cost;
  const cogs365 = storeTotals(addDays(asOf, -364), asOf).cost;
  const immobilizedValue = stock.reduce((sum, s) => {
    if (s.status === 'stalled') return sum + s.stockValue;
    if (s.coverageDays !== null && s.coverageDays > 90) {
      return sum + s.stockValue * ((s.coverageDays - 90) / s.coverageDays);
    }
    return sum;
  }, 0);
  return {
    asOf,
    stockValue,
    immobilizedValue,
    averageCoverageDays: cogs30 > 0 ? stockValue / (cogs30 / 30) : 0,
    annualTurnover: stockValue > 0 ? cogs365 / stockValue : 0,
    ruptureRiskCount: stock.filter((s) => s.status === 'rupture-risk').length,
    stalledCount: stock.filter((s) => s.status === 'stalled').length,
    lowTurnoverCount: stock.filter((s) => s.status === 'low-turnover').length,
    coverage: COVERAGE_BUCKETS.map((bucket) => {
      const items = stock.filter(bucket.test);
      return {
        bucket: bucket.label,
        skuCount: items.length,
        stockValue: items.reduce((sum, s) => sum + s.stockValue, 0),
      };
    }),
    products: stock,
  };
}

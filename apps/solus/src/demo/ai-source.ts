/**
 * DEMONSTRATION DATA — the analyst's data source over the fictitious
 * dataset, used only under /demo. It exposes the same shapes as the SQL
 * metric layer of a real organization, so the analyst's tools and checks are
 * identical in both environments.
 */
import type { AnalystDataSource, DateRange, GroupRow, SeriesDay, StockSnapshot } from '@/lib/ai/types';
import type { InventoryPosition, PeriodTotals, ProductMetrics, StockStatus } from '@/lib/intelligence/types';
import { addDays, daysBetween } from '@/lib/period';
import { DEMO_TODAY, categoryName, costOn, products, supplierName } from './catalog';
import { inventory, LOW_TURNOVER_COVERAGE, productStock, STALLED_AFTER_DAYS } from './metrics';
import { opportunities } from './opportunities';
import { organization } from './organization';
import { HISTORY_START, lastSaleDate, ordersFor, productTotals, salesHistory } from './sales';

const product = (id: string) => products.find((item) => item.id === id)!;

function metricsOf(id: string, range: DateRange): ProductMetrics | null {
  const totals = productTotals(id, range.start, range.end);
  if (totals.units === 0) return null;
  const item = product(id);
  const rows = (salesHistory().get(id) ?? []).filter((row) => row.date >= range.start && row.date <= range.end && row.units > 0);
  return {
    productId: id,
    sku: item.sku,
    name: item.name,
    categoryId: item.categoryId,
    categoryName: categoryName(item.categoryId),
    supplierId: item.supplierId,
    supplierName: supplierName(item.supplierId),
    catalogComplete: true,
    grossRevenue: totals.revenue,
    discounts: 0,
    returns: 0,
    netRevenue: totals.revenue,
    costedNetRevenue: totals.revenue,
    cogs: totals.cost,
    grossProfit: totals.revenue - totals.cost,
    grossMargin: totals.revenue > 0 ? (totals.revenue - totals.cost) / totals.revenue : null,
    costCoverage: 1,
    discountRate: 0,
    unitsSold: totals.units,
    orders: ordersFor(totals.units),
    saleDays: rows.length,
    fileCostLines: rows.length,
    catalogCostLines: 0,
    uncostedLines: 0,
    averagePrice: totals.revenue / totals.units,
    averageCost: totals.cost / totals.units,
  };
}

function totalsOf(range: DateRange): PeriodTotals {
  let revenue = 0;
  let cost = 0;
  let units = 0;
  let lines = 0;
  for (const item of products) {
    const t = productTotals(item.id, range.start, range.end);
    revenue += t.revenue;
    cost += t.cost;
    units += t.units;
    if (t.units > 0) lines += 1;
  }
  const orders = ordersFor(units);
  return {
    grossRevenue: revenue,
    discounts: 0,
    returns: 0,
    netRevenue: revenue,
    costedNetRevenue: revenue,
    cogs: cost,
    grossProfit: revenue - cost,
    grossMargin: revenue > 0 ? (revenue - cost) / revenue : null,
    costCoverage: revenue > 0 ? 1 : null,
    orders,
    averageTicket: orders > 0 ? revenue / orders : null,
    unitsSold: units,
    saleLines: lines,
    activeDays: daysBetween(range.start, range.end),
    catalogCostLines: 0,
    uncostedLines: 0,
  };
}

function statusOf(position: { status: string; coverageDays: number | null; leadTimeDays: number }): StockStatus {
  if (position.status === 'stalled' || position.status === 'rupture-risk' || position.status === 'low-turnover') return position.status;
  if (position.coverageDays === null) return 'insufficient-data';
  return position.coverageDays <= 30 ? 'high-turnover' : 'medium-turnover';
}

export function demoAnalystSource(): AnalystDataSource {
  return {
    async context() {
      return {
        environment: 'demo',
        organization: organization.name,
        lastSale: DEMO_TODAY,
        firstSale: HISTORY_START,
        lastSnapshot: DEMO_TODAY,
        notes: [
          'Demonstração: os dados são fictícios, sem descontos nem devoluções, e o número de vendas é estimado a partir das unidades (3,2 itens por venda).',
        ],
      };
    },
    async parameters() {
      return {
        minMargin: 0.15,
        maxDiscountRate: 0.15,
        stalledDays: STALLED_AFTER_DAYS,
        velocityWindowDays: 30,
        defaultLeadTimeDays: 7,
        highTurnoverDays: 30,
        lowTurnoverDays: LOW_TURNOVER_COVERAGE,
        excessCoverageDays: LOW_TURNOVER_COVERAGE,
        targetCoverageDays: 45,
        dropThreshold: 0.3,
      };
    },
    async totals(range) {
      return totalsOf(range);
    },
    async daily(range) {
      const days: SeriesDay[] = [];
      for (let day = range.start < HISTORY_START ? HISTORY_START : range.start; day <= range.end && day <= DEMO_TODAY; day = addDays(day, 1)) {
        let revenue = 0;
        let cost = 0;
        let units = 0;
        for (const rows of salesHistory().values()) {
          const row = rows[daysBetween(HISTORY_START, day) - 1];
          if (!row) continue;
          revenue += row.revenue;
          cost += row.cost;
          units += row.units;
        }
        days.push({ day, netRevenue: revenue, costedNetRevenue: revenue, grossProfit: revenue - cost, orders: ordersFor(units) });
      }
      return days;
    },
    async products(range) {
      return products.map((item) => metricsOf(item.id, range)).filter((item): item is ProductMetrics => item !== null);
    },
    async groups(kind, range) {
      const groups = new Map<string, GroupRow>();
      for (const item of products) {
        const metrics = metricsOf(item.id, range);
        if (!metrics) continue;
        const id = kind === 'category' ? item.categoryId : item.supplierId;
        const group = groups.get(id) ?? {
          id,
          name: kind === 'category' ? categoryName(id) : supplierName(id),
          products: 0,
          netRevenue: 0,
          costedNetRevenue: 0,
          grossProfit: 0,
          grossMargin: null,
          unitsSold: 0,
        };
        group.products += 1;
        group.netRevenue += metrics.netRevenue;
        group.costedNetRevenue += metrics.costedNetRevenue;
        group.grossProfit += metrics.grossProfit;
        group.unitsSold += metrics.unitsSold;
        group.grossMargin = group.costedNetRevenue > 0 ? group.grossProfit / group.costedNetRevenue : null;
        groups.set(id, group);
      }
      return [...groups.values()];
    },
    async stock(): Promise<StockSnapshot> {
      const summary = inventory(DEMO_TODAY);
      const positions: InventoryPosition[] = productStock(DEMO_TODAY).map((stock) => {
        const item = product(stock.productId);
        return {
          productId: stock.productId,
          sku: stock.sku,
          name: stock.name,
          categoryName: stock.category,
          supplierName: supplierName(item.supplierId),
          perishable: stock.perishable,
          snapshotDate: DEMO_TODAY,
          snapshotAgeDays: 0,
          onHand: stock.onHand,
          unitCost: costOn(item, DEMO_TODAY),
          costSource: 'catalog',
          stockValue: stock.stockValue,
          windowDays: 30,
          historyDays: daysBetween(HISTORY_START, DEMO_TODAY),
          unitsWindow: stock.dailyUnits * 30,
          avgDailyUnits: stock.dailyUnits,
          coverageDays: stock.coverageDays,
          annualTurnover: stock.coverageDays && stock.coverageDays > 0 ? 365 / stock.coverageDays : null,
          lastSaleDate: lastSaleDate(stock.productId),
          daysSinceLastSale: stock.daysSinceLastSale,
          leadTimeDays: stock.leadTimeDays,
          status: statusOf(stock),
        };
      });
      return { asOf: DEMO_TODAY, stockValue: summary.stockValue, annualTurnover: summary.annualTurnover, positions };
    },
    async opportunities() {
      return opportunities();
    },
  };
}

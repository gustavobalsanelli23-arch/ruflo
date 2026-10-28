import type { InventoryPosition, PeriodTotals, ProductMetrics, StockStatus } from '@/lib/intelligence/types';
import type { CoverageRow, InventoryRow, ProductRow, SummaryRow } from '@/types/database-analytics';

/**
 * Rows of the SQL metric functions → typed objects. PostgREST may send
 * NUMERIC as a number or a string; both become numbers here, and SQL nulls
 * stay null (an unavailable margin is never turned into zero).
 */

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));
const numOrNull = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));

export interface Coverage {
  firstSale: string | null;
  lastSale: string | null;
  salesImports: number;
  lastSnapshot: string | null;
  inventoryImports: number;
  products: number;
  incompleteProducts: number;
  productsWithCost: number;
  lastImportAt: string | null;
}

export function toCoverage(row: CoverageRow | undefined): Coverage {
  return {
    firstSale: row?.first_sale ?? null,
    lastSale: row?.last_sale ?? null,
    salesImports: num(row?.sales_imports),
    lastSnapshot: row?.last_snapshot ?? null,
    inventoryImports: num(row?.inventory_imports),
    products: num(row?.products),
    incompleteProducts: num(row?.incomplete_products),
    productsWithCost: num(row?.products_with_cost),
    lastImportAt: row?.last_import_at ?? null,
  };
}

export function toTotals(row: SummaryRow | undefined): PeriodTotals {
  return {
    grossRevenue: num(row?.gross_revenue),
    discounts: num(row?.discounts),
    returns: num(row?.returns),
    netRevenue: num(row?.net_revenue),
    costedNetRevenue: num(row?.costed_net_revenue),
    cogs: num(row?.cogs),
    grossProfit: num(row?.gross_profit),
    grossMargin: numOrNull(row?.gross_margin),
    costCoverage: numOrNull(row?.cost_coverage),
    orders: num(row?.orders),
    averageTicket: numOrNull(row?.average_ticket),
    unitsSold: num(row?.units_sold),
    saleLines: num(row?.sale_lines),
    activeDays: num(row?.active_days),
    catalogCostLines: num(row?.catalog_cost_lines),
    uncostedLines: num(row?.uncosted_lines),
  };
}

export function toProduct(row: ProductRow): ProductMetrics {
  return {
    productId: row.product_id,
    sku: row.sku,
    name: row.product_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    catalogComplete: row.catalog_complete,
    grossRevenue: num(row.gross_revenue),
    discounts: num(row.discounts),
    returns: num(row.returns),
    netRevenue: num(row.net_revenue),
    costedNetRevenue: num(row.costed_net_revenue),
    cogs: num(row.cogs),
    grossProfit: num(row.gross_profit),
    grossMargin: numOrNull(row.gross_margin),
    costCoverage: numOrNull(row.cost_coverage),
    discountRate: numOrNull(row.discount_rate),
    unitsSold: num(row.units_sold),
    orders: num(row.orders),
    saleDays: num(row.sale_days),
    fileCostLines: num(row.file_cost_lines),
    catalogCostLines: num(row.catalog_cost_lines),
    uncostedLines: num(row.uncosted_lines),
    averagePrice: numOrNull(row.average_price),
    averageCost: numOrNull(row.average_cost),
  };
}

const STATUSES: StockStatus[] = ['rupture', 'no-stock', 'insufficient-data', 'stalled', 'rupture-risk', 'high-turnover', 'medium-turnover', 'low-turnover'];

export function toPosition(row: InventoryRow): InventoryPosition {
  return {
    productId: row.product_id,
    sku: row.sku,
    name: row.product_name,
    categoryName: row.category_name,
    supplierName: row.supplier_name,
    perishable: row.perishable,
    snapshotDate: row.snapshot_date,
    snapshotAgeDays: num(row.snapshot_age_days),
    onHand: num(row.on_hand),
    unitCost: numOrNull(row.unit_cost),
    costSource: row.cost_source,
    stockValue: numOrNull(row.stock_value),
    windowDays: numOrNull(row.window_days),
    historyDays: numOrNull(row.history_days),
    unitsWindow: num(row.units_window),
    avgDailyUnits: numOrNull(row.avg_daily_units),
    coverageDays: numOrNull(row.coverage_days),
    annualTurnover: numOrNull(row.annual_turnover),
    lastSaleDate: row.last_sale_date,
    daysSinceLastSale: numOrNull(row.days_since_last_sale),
    leadTimeDays: num(row.lead_time_days),
    status: STATUSES.includes(row.stock_status as StockStatus) ? (row.stock_status as StockStatus) : 'insufficient-data',
  };
}

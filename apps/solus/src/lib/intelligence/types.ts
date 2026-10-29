/**
 * Inputs and outputs of the Intelligence Engine. Inputs come from the SQL
 * metric functions (the single source of numbers); the engine only reads
 * them and applies rules. It never computes revenue, cost or margin itself.
 */

export type OpportunityType =
  | 'low_margin'
  | 'negative_margin'
  | 'stalled_stock'
  | 'rupture_risk'
  | 'tied_up_capital'
  | 'performance_drop'
  | 'profitability';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type ImpactKind = 'monthly_profit' | 'one_off_profit' | 'capital';

export interface Window {
  start: string;
  end: string;
  days: number;
}

export interface AnalysisParameters {
  minMargin: number;
  maxDiscountRate: number;
  stalledDays: number;
  velocityWindowDays: number;
  defaultLeadTimeDays: number;
  highTurnoverDays: number;
  lowTurnoverDays: number;
  excessCoverageDays: number;
  targetCoverageDays: number;
  dropThreshold: number;
}

/** One row of public.analytics_summary. */
export interface PeriodTotals {
  grossRevenue: number;
  discounts: number;
  returns: number;
  netRevenue: number;
  costedNetRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number | null;
  costCoverage: number | null;
  orders: number;
  averageTicket: number | null;
  unitsSold: number;
  saleLines: number;
  activeDays: number;
  catalogCostLines: number;
  uncostedLines: number;
}

/** One row of public.analytics_products. */
export interface ProductMetrics {
  productId: string;
  sku: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  catalogComplete: boolean;
  grossRevenue: number;
  discounts: number;
  returns: number;
  netRevenue: number;
  costedNetRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number | null;
  costCoverage: number | null;
  discountRate: number | null;
  unitsSold: number;
  orders: number;
  saleDays: number;
  fileCostLines: number;
  catalogCostLines: number;
  uncostedLines: number;
  averagePrice: number | null;
  averageCost: number | null;
}

export type StockStatus =
  | 'rupture'
  | 'no-stock'
  | 'insufficient-data'
  | 'stalled'
  | 'rupture-risk'
  | 'high-turnover'
  | 'medium-turnover'
  | 'low-turnover';

/** One row of public.inventory_position. */
export interface InventoryPosition {
  productId: string;
  sku: string;
  name: string;
  categoryName: string | null;
  supplierName: string | null;
  perishable: boolean | null;
  snapshotDate: string;
  snapshotAgeDays: number;
  onHand: number;
  unitCost: number | null;
  costSource: string;
  stockValue: number | null;
  windowDays: number | null;
  historyDays: number | null;
  unitsWindow: number;
  avgDailyUnits: number | null;
  coverageDays: number | null;
  annualTurnover: number | null;
  lastSaleDate: string | null;
  daysSinceLastSale: number | null;
  leadTimeDays: number;
  status: StockStatus;
}

export interface EngineInput {
  params: AnalysisParameters;
  /** Last day with sales data (null without sales). */
  dataThrough: string | null;
  /** First day with sales data. */
  firstSale: string | null;
  /** Main window for margin and discount rules (up to 90 days). */
  window: Window | null;
  totals: PeriodTotals | null;
  products: ProductMetrics[];
  /** Last 30 days and the 30 before, for drops and cost changes. */
  comparison: { current: Window; previous: Window; currentProducts: ProductMetrics[]; previousProducts: ProductMetrics[] } | null;
  inventory: { asOf: string; positions: InventoryPosition[]; totalValue: number; soldWithoutPosition: number } | null;
}

export type FactFormat = 'currency' | 'percent' | 'number' | 'days' | 'date' | 'text';

/** A measured fact, with where it came from. */
export interface Fact {
  label: string;
  value: number | string;
  format: FactFormat;
  source: string;
}

export interface OpportunityDraft {
  type: OpportunityType;
  dedupeKey: string;
  entityType: 'product' | 'category' | 'supplier' | 'organization';
  entityId: string | null;
  entityLabel: string;
  title: string;
  summary: string;
  priority: Priority;
  confidence: number;
  impactValue: number;
  impactKind: ImpactKind;
  impactMethod: string;
  facts: Fact[];
  hypotheses: string[];
  recommendations: string[];
  periodStart: string;
  periodEnd: string;
}

export interface EngineResult {
  opportunities: OpportunityDraft[];
  limitations: string[];
}

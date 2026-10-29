import type { Opportunity } from '@/lib/data/types';
import type { AnalysisParameters, InventoryPosition, PeriodTotals, ProductMetrics } from '@/lib/intelligence/types';

/**
 * What the analyst can read. Two implementations: a real organization (SQL
 * metric functions with the person's session, RLS applied) and the
 * demonstration dataset. The analyst never reads tables directly and never
 * receives anything outside the organization.
 */

export interface DateRange {
  start: string;
  end: string;
}

export interface SourceContext {
  environment: 'tenant' | 'demo';
  organization: string;
  /** Last day with imported sales: periods end here, not "today". */
  lastSale: string | null;
  firstSale: string | null;
  lastSnapshot: string | null;
  /** Demonstration data has no discounts, returns or order numbers. */
  notes: string[];
}

export interface SeriesDay {
  day: string;
  netRevenue: number;
  costedNetRevenue: number;
  grossProfit: number;
  orders: number;
}

export interface GroupRow {
  id: string | null;
  name: string | null;
  products: number;
  netRevenue: number;
  costedNetRevenue: number;
  grossProfit: number;
  grossMargin: number | null;
  unitsSold: number;
}

export interface StockSnapshot {
  asOf: string;
  stockValue: number;
  annualTurnover: number | null;
  positions: InventoryPosition[];
}

export interface AnalystDataSource {
  context(): Promise<SourceContext>;
  parameters(): Promise<AnalysisParameters>;
  totals(range: DateRange): Promise<PeriodTotals>;
  daily(range: DateRange): Promise<SeriesDay[]>;
  products(range: DateRange): Promise<ProductMetrics[]>;
  groups(kind: 'category' | 'supplier', range: DateRange): Promise<GroupRow[]>;
  stock(): Promise<StockSnapshot | null>;
  opportunities(): Promise<Opportunity[]>;
}

/** A column of a table the analyst may show; `key` indexes the formatted row. */
export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

/** What a data tool returns to the model (JSON) and keeps for rendering. */
export interface ToolOutput {
  ref: string;
  tool: string;
  /** Short description of the query, shown in the answer's sources. */
  source: { name: string; detail: string };
  /** Sent to the model as the tool result. */
  data: Record<string, unknown>;
  /** Present when the result can be shown as a table. */
  table?: { columns: TableColumn[]; rows: Record<string, string>[] };
  /** Present when the result can be shown as metric cards. */
  metrics?: { id: string; label: string; value: string; delta?: string; tone?: 'positive' | 'negative' }[];
  /** Present when the result can be shown as a chart. */
  series?: { label: string; values: Record<string, number | null> }[];
}

export type ProgressEvent = { type: 'step'; label: string };

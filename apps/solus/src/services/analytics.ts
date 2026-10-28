import 'server-only';
import { toCoverage, toPosition, toProduct, toTotals, type Coverage } from '@/lib/analytics/mappers';
import type { AnalysisParameters, InventoryPosition, PeriodTotals, ProductMetrics, Window } from '@/lib/intelligence/types';
import { logServerError } from '@/lib/log';
import type { SolusClient } from '@/lib/supabase/server';
import type { DailyRow, GroupRow, InventorySummaryRow } from '@/types/database-analytics';

/**
 * Reads of the metric layer (SQL functions in
 * supabase/migrations/20261029100300_analytics_metrics.sql), always with the
 * signed-in user's session: RLS applies, and the functions only count data
 * from completed imports. Pages and the Intelligence Engine read numbers
 * only through here.
 */

/** PostgREST returns at most this many rows per request (Supabase default). */
const PAGE = 1000;

export class AnalyticsError extends Error {
  constructor() {
    super('Não foi possível carregar as análises desta organização.');
  }
}

function unwrap<T>(scope: string, result: { data: T | null; error: unknown }): T {
  if (result.error || result.data === null) {
    logServerError(`analytics: ${scope}`, result.error);
    throw new AnalyticsError();
  }
  return result.data;
}

const range = (organizationId: string, window: Pick<Window, 'start' | 'end'>) => ({
  p_organization_id: organizationId,
  p_start: window.start,
  p_end: window.end,
});

export async function getCoverage(supabase: SolusClient, organizationId: string): Promise<Coverage> {
  const rows = unwrap('cobertura', await supabase.rpc('analytics_coverage', { p_organization_id: organizationId }));
  return toCoverage(rows[0]);
}

export async function getParameters(supabase: SolusClient, organizationId: string): Promise<AnalysisParameters & { customized: boolean }> {
  const [row] = unwrap('parâmetros', await supabase.rpc('analysis_parameters', { p_organization_id: organizationId }));
  return {
    minMargin: Number(row?.min_margin ?? 0.2),
    maxDiscountRate: Number(row?.max_discount_rate ?? 0.15),
    stalledDays: Number(row?.stalled_days ?? 60),
    velocityWindowDays: Number(row?.velocity_window_days ?? 90),
    defaultLeadTimeDays: Number(row?.default_lead_time_days ?? 7),
    highTurnoverDays: Number(row?.high_turnover_days ?? 30),
    lowTurnoverDays: Number(row?.low_turnover_days ?? 90),
    excessCoverageDays: Number(row?.excess_coverage_days ?? 120),
    targetCoverageDays: Number(row?.target_coverage_days ?? 45),
    dropThreshold: Number(row?.drop_threshold ?? 0.3),
    customized: Boolean(row?.customized),
  };
}

export async function getTotals(supabase: SolusClient, organizationId: string, window: Pick<Window, 'start' | 'end'>): Promise<PeriodTotals> {
  const rows = unwrap('totais', await supabase.rpc('analytics_summary', range(organizationId, window)));
  return toTotals(rows[0]);
}

export interface DailyPoint {
  day: string;
  grossRevenue: number;
  netRevenue: number;
  costedNetRevenue: number;
  cogs: number;
  grossProfit: number;
  orders: number;
  unitsSold: number;
}

export async function getDaily(supabase: SolusClient, organizationId: string, window: Pick<Window, 'start' | 'end'>): Promise<DailyPoint[]> {
  const rows: DailyRow[] = unwrap('série diária', await supabase.rpc('analytics_daily', range(organizationId, window)));
  return rows.map((row) => ({
    day: row.day,
    grossRevenue: Number(row.gross_revenue),
    netRevenue: Number(row.net_revenue),
    costedNetRevenue: Number(row.costed_net_revenue),
    cogs: Number(row.cogs),
    grossProfit: Number(row.gross_profit),
    orders: Number(row.orders),
    unitsSold: Number(row.units_sold),
  }));
}

/** Products with movement in the window, best sellers first; `limit` rows at most. */
export async function getProducts(
  supabase: SolusClient,
  organizationId: string,
  window: Pick<Window, 'start' | 'end'>,
  limit = 500,
): Promise<{ rows: ProductMetrics[]; truncated: boolean }> {
  const rows = unwrap(
    'produtos',
    await supabase
      .rpc('analytics_products', range(organizationId, window))
      .order('net_revenue', { ascending: false })
      .order('product_id')
      .range(0, limit),
  );
  return { rows: rows.slice(0, limit).map(toProduct), truncated: rows.length > limit };
}

/** Every product with movement (paged), for the engine. */
export async function getAllProducts(supabase: SolusClient, organizationId: string, window: Pick<Window, 'start' | 'end'>): Promise<ProductMetrics[]> {
  const all: ProductMetrics[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const rows = unwrap(
      'produtos (todos)',
      await supabase
        .rpc('analytics_products', range(organizationId, window))
        .order('product_id')
        .range(offset, offset + PAGE - 1),
    );
    all.push(...rows.map(toProduct));
    if (rows.length < PAGE) return all;
  }
}

export interface GroupMetrics {
  id: string | null;
  name: string | null;
  products: number;
  netRevenue: number;
  costedNetRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number | null;
  costCoverage: number | null;
  unitsSold: number;
}

const toGroup = (row: GroupRow, id: string | null, name: string | null): GroupMetrics => ({
  id,
  name,
  products: Number(row.products),
  netRevenue: Number(row.net_revenue),
  costedNetRevenue: Number(row.costed_net_revenue),
  cogs: Number(row.cogs),
  grossProfit: Number(row.gross_profit),
  grossMargin: row.gross_margin === null ? null : Number(row.gross_margin),
  costCoverage: row.cost_coverage === null ? null : Number(row.cost_coverage),
  unitsSold: Number(row.units_sold),
});

export async function getCategories(supabase: SolusClient, organizationId: string, window: Pick<Window, 'start' | 'end'>): Promise<GroupMetrics[]> {
  const rows = unwrap('categorias', await supabase.rpc('analytics_categories', range(organizationId, window)).order('net_revenue', { ascending: false }));
  return rows.map((row) => toGroup(row, row.category_id, row.category_name));
}

export async function getSuppliers(supabase: SolusClient, organizationId: string, window: Pick<Window, 'start' | 'end'>): Promise<GroupMetrics[]> {
  const rows = unwrap('fornecedores', await supabase.rpc('analytics_suppliers', range(organizationId, window)).order('net_revenue', { ascending: false }));
  return rows.map((row) => toGroup(row, row.supplier_id, row.supplier_name));
}

/** Order of attention in the stock table: problems first, then by capital. */
const ATTENTION = ['rupture', 'rupture-risk', 'stalled', 'low-turnover', 'medium-turnover', 'high-turnover', 'no-stock', 'insufficient-data'];

export async function getInventory(
  supabase: SolusClient,
  organizationId: string,
  asOf: string,
  limit = 500,
): Promise<{ rows: InventoryPosition[]; truncated: boolean }> {
  const rows = unwrap(
    'estoque',
    await supabase
      .rpc('inventory_position', { p_organization_id: organizationId, p_as_of: asOf })
      .order('stock_value', { ascending: false, nullsFirst: false })
      .order('product_id')
      .range(0, limit),
  );
  const positions = rows.slice(0, limit).map(toPosition);
  positions.sort((a, b) => ATTENTION.indexOf(a.status) - ATTENTION.indexOf(b.status) || (b.stockValue ?? 0) - (a.stockValue ?? 0));
  return { rows: positions, truncated: rows.length > limit };
}

export async function getAllInventory(supabase: SolusClient, organizationId: string, asOf: string): Promise<InventoryPosition[]> {
  const all: InventoryPosition[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const rows = unwrap(
      'estoque (todos)',
      await supabase
        .rpc('inventory_position', { p_organization_id: organizationId, p_as_of: asOf })
        .order('product_id')
        .range(offset, offset + PAGE - 1),
    );
    all.push(...rows.map(toPosition));
    if (rows.length < PAGE) return all;
  }
}

export interface InventoryTotals {
  products: number;
  stockValue: number;
  uncostedProducts: number;
  lastSnapshot: string | null;
  oldestSnapshot: string | null;
  windowDays: number | null;
  annualTurnover: number | null;
  soldWithoutPosition: number;
  byStatus: { status: string; products: number; value: number }[];
}

export async function getInventoryTotals(supabase: SolusClient, organizationId: string, asOf: string): Promise<InventoryTotals> {
  const [row]: InventorySummaryRow[] = unwrap('resumo do estoque', await supabase.rpc('inventory_summary', { p_organization_id: organizationId, p_as_of: asOf }));
  const byStatus = Array.isArray(row?.by_status) ? (row.by_status as { status: string; products: number; value: number }[]) : [];
  return {
    products: Number(row?.products ?? 0),
    stockValue: Number(row?.stock_value ?? 0),
    uncostedProducts: Number(row?.uncosted_products ?? 0),
    lastSnapshot: row?.last_snapshot ?? null,
    oldestSnapshot: row?.oldest_snapshot ?? null,
    windowDays: row?.window_days ?? null,
    annualTurnover: row?.annual_turnover === null || row?.annual_turnover === undefined ? null : Number(row.annual_turnover),
    soldWithoutPosition: Number(row?.sold_without_position ?? 0),
    byStatus: byStatus.map((item) => ({ status: item.status, products: Number(item.products), value: Number(item.value) })),
  };
}

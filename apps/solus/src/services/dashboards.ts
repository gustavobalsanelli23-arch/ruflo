import 'server-only';
import type { Coverage } from '@/lib/analytics/mappers';
import {
  buildCategories,
  buildCoverage,
  buildInventorySnapshot,
  buildMarginPoints,
  buildProductProfit,
  buildSuppliers,
  buildTrend,
  summarizeOpportunities,
  toProductStock,
} from '@/lib/analytics/dashboard';
import type {
  ActivityItem,
  CategoryPerformance,
  CoverageBucket,
  InventorySnapshot,
  MarginPoint,
  Opportunity,
  OpportunitySummary,
  Period,
  PeriodKey,
  ProductProfit,
  ProductStock,
  SupplierProfit,
  TrendPoint,
} from '@/lib/data/types';
import type { AnalysisParameters, PeriodTotals } from '@/lib/intelligence/types';
import { logServerError } from '@/lib/log';
import { addDays, resolvePeriod } from '@/lib/period';
import type { SolusClient } from '@/lib/supabase/server';
import {
  getAllProducts,
  getCategories,
  getCoverage,
  getDaily,
  getInventory,
  getInventoryTotals,
  getParameters,
  getProducts,
  getSuppliers,
  getTotals,
  getUrgentInventory,
} from './analytics';
import { lastAnalysisRun, listOpportunities } from './opportunities';

/**
 * Data of the real dashboards, in the shapes the existing screens render.
 * Every number comes from the SQL metric layer (src/services/analytics);
 * here they are only fetched in parallel and arranged.
 */

const DATASET_LABEL = { sales: 'vendas', products: 'produtos', inventory: 'estoque', suppliers: 'fornecedores' } as const;

export interface TenantBase {
  coverage: Coverage;
  /** Last day with sales (or the last stock position when there are no sales). */
  dataThrough: string;
}

export async function loadBase(supabase: SolusClient, organizationId: string): Promise<TenantBase | null> {
  const coverage = await getCoverage(supabase, organizationId);
  const dataThrough = coverage.lastSale ?? coverage.lastSnapshot;
  return dataThrough ? { coverage, dataThrough } : null;
}

export interface TenantOverview {
  period: Period;
  current: PeriodTotals;
  previous: PeriodTotals;
  trend: TrendPoint[];
  marginTrend: TrendPoint[];
  categories: CategoryPerformance[];
  inventory: (InventorySnapshot & { asOf: string }) | null;
  opportunities: { summary: OpportunitySummary; top: Opportunity[] };
  activity: ActivityItem[];
  limitations: string[];
}

export async function loadOverview(supabase: SolusClient, organizationId: string, base: TenantBase, key: PeriodKey): Promise<TenantOverview> {
  const { coverage } = base;
  const period = resolvePeriod(key, coverage.lastSale ?? base.dataThrough);
  const hasSales = coverage.lastSale !== null;
  const current = { start: period.start, end: period.end };
  const previous = { start: period.previousStart, end: period.previousEnd };

  const [now, before, daily, categoriesNow, categoriesBefore, opportunities, inventory, activity, run] = await Promise.all([
    getTotals(supabase, organizationId, current),
    getTotals(supabase, organizationId, previous),
    hasSales ? getDaily(supabase, organizationId, { start: period.previousStart, end: period.end }) : Promise.resolve([]),
    hasSales ? getCategories(supabase, organizationId, current) : Promise.resolve([]),
    hasSales ? getCategories(supabase, organizationId, previous) : Promise.resolve([]),
    listOpportunities(supabase, organizationId),
    coverage.lastSnapshot ? loadInventorySnapshot(supabase, organizationId, coverage.lastSnapshot) : Promise.resolve(null),
    loadActivity(supabase, organizationId),
    lastAnalysisRun(supabase, organizationId),
  ]);
  const { trend, marginTrend } = buildTrend(daily, period);

  return {
    period,
    current: now,
    previous: before,
    trend,
    marginTrend,
    categories: buildCategories(categoriesNow, categoriesBefore),
    inventory,
    opportunities: summarizeOpportunities(opportunities.items),
    activity,
    limitations: Array.isArray(run?.limitations) ? (run.limitations as string[]) : [],
  };
}

async function loadInventorySnapshot(supabase: SolusClient, organizationId: string, asOf: string) {
  const [totals, urgent] = await Promise.all([getInventoryTotals(supabase, organizationId, asOf), getUrgentInventory(supabase, organizationId, asOf)]);
  return { ...buildInventorySnapshot(totals, totals.windowCogs, urgent), asOf };
}

async function loadActivity(supabase: SolusClient, organizationId: string): Promise<ActivityItem[]> {
  const [imports, runs] = await Promise.all([
    supabase
      .from('data_imports')
      .select('id, file_name, dataset, status, record_count, completed_at, reverted_at, created_at, author:profiles!data_imports_created_by_fkey(full_name, email)')
      .eq('organization_id', organizationId)
      .in('status', ['completed', 'with_errors', 'reverted'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('analysis_runs').select('id, created_at, detected_count, created_count, trigger').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(3),
  ]);
  if (imports.error || runs.error) logServerError('visão geral: atividade', imports.error ?? runs.error);

  const items: ActivityItem[] = [
    ...(imports.data ?? []).map((row) => ({
      id: `import-${row.id}`,
      kind: 'import' as const,
      title: row.status === 'reverted' ? `Importação desfeita: ${row.file_name}` : `Importação de ${DATASET_LABEL[row.dataset]}: ${row.file_name}`,
      detail: row.status === 'reverted' ? 'Os dados dela saíram das análises.' : `${row.record_count.toLocaleString('pt-BR')} registros gravados.`,
      at: row.reverted_at ?? row.completed_at ?? row.created_at,
      actor: row.author?.full_name ?? row.author?.email ?? undefined,
    })),
    ...(runs.data ?? []).map((row) => ({
      id: `run-${row.id}`,
      kind: 'analysis' as const,
      title: 'Análise das oportunidades',
      detail: `${row.detected_count} detectadas, ${row.created_count} novas.`,
      at: row.created_at,
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
}

export interface TenantProfit {
  period: Period;
  params: AnalysisParameters;
  current: PeriodTotals;
  previous: PeriodTotals;
  products: ProductProfit[];
  productsTruncated: boolean;
  categories: CategoryPerformance[];
  suppliers: SupplierProfit[];
  marginPoints: MarginPoint[];
}

export async function loadProfit(supabase: SolusClient, organizationId: string, base: TenantBase, key: PeriodKey): Promise<TenantProfit> {
  const period = resolvePeriod(key, base.coverage.lastSale ?? base.dataThrough);
  const current = { start: period.start, end: period.end };
  const previous = { start: period.previousStart, end: period.previousEnd };
  const [params, now, before, products, previousProducts, categoriesNow, categoriesBefore, suppliers, daily] = await Promise.all([
    getParameters(supabase, organizationId),
    getTotals(supabase, organizationId, current),
    getTotals(supabase, organizationId, previous),
    getProducts(supabase, organizationId, current),
    getAllProducts(supabase, organizationId, previous),
    getCategories(supabase, organizationId, current),
    getCategories(supabase, organizationId, previous),
    getSuppliers(supabase, organizationId, current),
    getDaily(supabase, organizationId, { start: addDays(period.end, -729), end: period.end }),
  ]);
  return {
    period,
    params,
    current: now,
    previous: before,
    products: buildProductProfit(products.rows, previousProducts, params.minMargin),
    productsTruncated: products.truncated,
    categories: buildCategories(categoriesNow, categoriesBefore),
    suppliers: buildSuppliers(suppliers),
    marginPoints: buildMarginPoints(daily, period.end),
  };
}

export interface TenantInventory {
  asOf: string;
  params: AnalysisParameters;
  stockValue: number;
  uncostedProducts: number;
  products: number;
  annualTurnover: number | null;
  averageCoverageDays: number | null;
  immobilizedValue: number;
  counts: Record<'rupture' | 'stalled' | 'lowTurnover' | 'insufficient', number>;
  soldWithoutPosition: number;
  coverage: CoverageBucket[];
  byCategory: { name: string; value: number; share: number; items: number; attention: number; coverage: number | null }[];
  items: ProductStock[];
  itemsTruncated: boolean;
  dataThrough: string | null;
}

export async function loadInventory(supabase: SolusClient, organizationId: string, base: TenantBase): Promise<TenantInventory | null> {
  const asOf = base.coverage.lastSnapshot;
  if (!asOf) return null;
  const [params, totals, positions] = await Promise.all([
    getParameters(supabase, organizationId),
    getInventoryTotals(supabase, organizationId, asOf),
    getInventory(supabase, organizationId, asOf),
  ]);
  const count = (...statuses: string[]) => totals.byStatus.filter((item) => statuses.includes(item.status)).reduce((sum, item) => sum + item.products, 0);
  const value = (...statuses: string[]) => totals.byStatus.filter((item) => statuses.includes(item.status)).reduce((sum, item) => sum + item.value, 0);
  const dailyCost = totals.windowCogs !== null && totals.windowDays ? totals.windowCogs / totals.windowDays : null;
  return {
    asOf,
    params,
    stockValue: totals.stockValue,
    uncostedProducts: totals.uncostedProducts,
    products: totals.products,
    annualTurnover: totals.annualTurnover,
    averageCoverageDays: dailyCost && dailyCost > 0 ? totals.stockValue / dailyCost : null,
    immobilizedValue: value('stalled', 'low-turnover'),
    counts: {
      rupture: count('rupture', 'rupture-risk'),
      stalled: count('stalled'),
      lowTurnover: count('low-turnover'),
      insufficient: count('insufficient-data'),
    },
    soldWithoutPosition: totals.soldWithoutPosition,
    coverage: buildCoverage(totals.byCoverage),
    byCategory: totals.byCategory.map((row) => ({
      name: row.category,
      value: row.value,
      share: totals.stockValue > 0 ? row.value / totals.stockValue : 0,
      items: row.products,
      attention: row.attention,
      coverage: row.dailyCost > 0 ? row.value / row.dailyCost : null,
    })),
    items: positions.rows.map(toProductStock),
    itemsTruncated: positions.truncated,
    dataThrough: base.coverage.lastSale,
  };
}

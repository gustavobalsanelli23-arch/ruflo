import type { CategoryPerformance, InventorySnapshot, Opportunity, OpportunitySummary, OverviewData, Period } from '@/lib/data/types';
import type { TenantOverview } from '@/services/dashboards';

/**
 * What the monthly report shows, the same for a real organization and for
 * the demonstration: the period's figures against the previous period,
 * categories, stock and the open opportunities. Built from the same data as
 * the executive overview, so every number matches the screens.
 */

export interface Figure {
  value: number | null;
  previous: number | null;
}

export interface ReportData {
  organization: string;
  period: Period;
  revenue: Figure;
  grossProfit: Figure;
  grossMargin: Figure;
  averageTicket: Figure;
  orders: Figure;
  categories: CategoryPerformance[];
  inventory: InventorySnapshot | null;
  opportunities: { summary: OpportunitySummary; top: Opportunity[] };
  notes: string[];
}

const TOP_CATEGORIES = 8;
const TOP_OPPORTUNITIES = 6;

export function reportFromTenant(organization: string, data: TenantOverview): ReportData {
  const { current, previous } = data;
  const notes = [...data.limitations];
  if (current.costCoverage !== null && current.costCoverage < 0.999) {
    notes.unshift('Parte da receita do período não tem custo conhecido: lucro bruto e margem consideram só a parte com custo.');
  }
  return {
    organization,
    period: data.period,
    revenue: { value: current.netRevenue, previous: previous.netRevenue },
    grossProfit: { value: current.grossProfit, previous: previous.grossProfit },
    grossMargin: { value: current.grossMargin, previous: previous.grossMargin },
    averageTicket: { value: current.averageTicket, previous: previous.averageTicket },
    orders: { value: current.orders > 0 ? current.orders : null, previous: previous.orders > 0 ? previous.orders : null },
    categories: data.categories.slice(0, TOP_CATEGORIES),
    inventory: data.inventory,
    opportunities: { summary: data.opportunities.summary, top: data.opportunities.top.slice(0, TOP_OPPORTUNITIES) },
    notes,
  };
}

export function reportFromDemo(organization: string, data: OverviewData): ReportData {
  return {
    organization,
    period: data.period,
    revenue: data.revenue,
    grossProfit: data.grossProfit,
    grossMargin: data.grossMargin,
    averageTicket: data.averageTicket,
    orders: data.orders,
    categories: data.categories.slice(0, TOP_CATEGORIES),
    inventory: data.inventory,
    opportunities: { summary: data.opportunitySummary, top: data.topOpportunities.slice(0, TOP_OPPORTUNITIES) },
    notes: ['Demonstração: empresa e números fictícios.'],
  };
}

import type {
  AnalystData,
  DataHubData,
  InventoryData,
  Opportunity,
  OverviewData,
  PeriodKey,
  ProfitData,
  SettingsData,
  Workspace,
} from './types';

/**
 * The single seam between screens and data. Pages call these methods; they
 * never import fixtures directly. Phase 02 swaps the implementation returned
 * by getRepository() for one backed by Supabase (scoped to the signed-in
 * organization), keeping this interface intact.
 */
export interface SolusRepository {
  getWorkspace(): Promise<Workspace>;
  getOverview(period: PeriodKey): Promise<OverviewData>;
  getProfitAnalytics(period: PeriodKey): Promise<ProfitData>;
  getInventory(): Promise<InventoryData>;
  getOpportunities(): Promise<Opportunity[]>;
  getAnalyst(): Promise<AnalystData>;
  getDataHub(): Promise<DataHubData>;
  getSettings(): Promise<SettingsData>;
}

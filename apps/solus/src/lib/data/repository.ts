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
 * The contract the analytical screens render from. demoRepository implements
 * it with fictitious data for /demo. The analytics engine (Part 04) will add
 * an implementation scoped to the signed-in organization, so the screens can
 * be reused without changes.
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

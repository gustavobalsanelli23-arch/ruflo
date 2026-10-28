/**
 * (Type aliases, not interfaces: supabase-js needs index-signature-compatible
 * shapes.)
 *
 * Database types of the analytics model (Parte 04), merged into `Database` in
 * ./database.ts. Mirrors supabase/migrations/20261029*; keep both in sync.
 * Tables here are read-only for clients (writes go through the RPCs), so
 * their Insert/Update shapes are empty.
 */

import type { Json } from './database';

export type ImportStatusV2 = 'pending' | 'validated' | 'processing' | 'completed' | 'with_errors' | 'failed' | 'canceled' | 'reverted';
export type OpportunityTypeDb = 'low_margin' | 'negative_margin' | 'stalled_stock' | 'rupture_risk' | 'tied_up_capital' | 'performance_drop' | 'profitability';
export type OpportunityStatusDb = 'new' | 'reviewing' | 'in_progress' | 'resolved' | 'dismissed';
export type OpportunityPriorityDb = 'low' | 'medium' | 'high' | 'critical';
export type ImpactKindDb = 'monthly_profit' | 'one_off_profit' | 'capital';
export type IssueSeverity = 'error' | 'warning';

type ReadOnly<Row> = { Row: Row; Insert: Record<string, never>; Update: Record<string, never>; Relationships: [] };

export type ImportErrorRow = {
  id: number;
  organization_id: string;
  import_id: string;
  row_number: number | null;
  field: string | null;
  code: string;
  severity: IssueSeverity;
  message: string;
  raw_value: string | null;
  created_at: string;
};

export type OpportunityRow = {
  id: string;
  organization_id: string;
  type: OpportunityTypeDb;
  dedupe_key: string;
  entity_type: 'product' | 'category' | 'supplier' | 'organization';
  entity_id: string | null;
  entity_label: string;
  title: string;
  summary: string;
  priority: OpportunityPriorityDb;
  confidence: number;
  impact_value: number;
  impact_kind: ImpactKindDb;
  impact_method: string;
  facts: Json;
  hypotheses: Json;
  recommendations: Json;
  series: Json | null;
  period_start: string;
  period_end: string;
  status: OpportunityStatusDb;
  active: boolean;
  detected_count: number;
  first_detected_at: string;
  last_detected_at: string;
  last_run_id: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OpportunityEventRow = {
  id: number;
  organization_id: string;
  opportunity_id: string;
  event: 'detected' | 'redetected' | 'status_changed' | 'auto_resolved';
  from_status: OpportunityStatusDb | null;
  to_status: OpportunityStatusDb | null;
  actor_id: string | null;
  run_id: string | null;
  note: string | null;
  created_at: string;
};

export type AnalysisRunRow = {
  id: string;
  organization_id: string;
  trigger: 'import' | 'manual' | 'revert' | 'settings';
  import_id: string | null;
  triggered_by: string | null;
  engine_version: string;
  period_start: string | null;
  period_end: string | null;
  detected_count: number;
  created_count: number;
  updated_count: number;
  reopened_count: number;
  resolved_count: number;
  limitations: Json;
  created_at: string;
};

export type AnalyticsTables = {
  import_errors: ReadOnly<ImportErrorRow>;
  opportunities: ReadOnly<OpportunityRow>;
  opportunity_events: {
    Row: OpportunityEventRow;
    Insert: Record<string, never>;
    Update: Record<string, never>;
    Relationships: [
      {
        foreignKeyName: 'opportunity_events_actor_id_fkey';
        columns: ['actor_id'];
        isOneToOne: false;
        referencedRelation: 'profiles';
        referencedColumns: ['id'];
      },
    ];
  };
  analysis_runs: ReadOnly<AnalysisRunRow>;
};

type Rows<T> = { Args: Record<string, unknown>; Returns: T[] };

export type AnalyticsParametersRow = {
  min_margin: number;
  max_discount_rate: number;
  stalled_days: number;
  velocity_window_days: number;
  default_lead_time_days: number;
  high_turnover_days: number;
  low_turnover_days: number;
  excess_coverage_days: number;
  target_coverage_days: number;
  drop_threshold: number;
  customized: boolean;
};

export type CoverageRow = {
  first_sale: string | null;
  last_sale: string | null;
  sales_imports: number;
  last_snapshot: string | null;
  inventory_imports: number;
  products: number;
  incomplete_products: number;
  products_with_cost: number;
  last_import_at: string | null;
};

export type SummaryRow = {
  gross_revenue: number;
  discounts: number;
  returns: number;
  net_revenue: number;
  costed_net_revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin: number | null;
  cost_coverage: number | null;
  orders: number;
  identified_net_revenue: number;
  average_ticket: number | null;
  units_sold: number;
  sale_lines: number;
  return_lines: number;
  active_days: number;
  catalog_cost_lines: number;
  uncosted_lines: number;
};

export type DailyRow = {
  day: string;
  gross_revenue: number;
  net_revenue: number;
  costed_net_revenue: number;
  cogs: number;
  gross_profit: number;
  orders: number;
  units_sold: number;
};

export type ProductRow = {
  product_id: string;
  sku: string;
  product_name: string;
  category_id: string | null;
  category_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  catalog_complete: boolean;
  gross_revenue: number;
  discounts: number;
  returns: number;
  net_revenue: number;
  costed_net_revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin: number | null;
  cost_coverage: number | null;
  discount_rate: number | null;
  units_sold: number;
  orders: number;
  sale_days: number;
  file_cost_lines: number;
  catalog_cost_lines: number;
  uncosted_lines: number;
  average_price: number | null;
  average_cost: number | null;
  first_sale: string | null;
  last_sale: string | null;
};

export type GroupRow = {
  products: number;
  gross_revenue: number;
  discounts: number;
  returns: number;
  net_revenue: number;
  costed_net_revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin: number | null;
  cost_coverage: number | null;
  units_sold: number;
};

export type InventoryRow = {
  product_id: string;
  sku: string;
  product_name: string;
  category_id: string | null;
  category_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  perishable: boolean | null;
  snapshot_date: string;
  snapshot_age_days: number;
  on_hand: number;
  unit_cost: number | null;
  cost_source: string;
  stock_value: number | null;
  window_start: string | null;
  window_days: number | null;
  history_days: number | null;
  units_window: number;
  avg_daily_units: number | null;
  coverage_days: number | null;
  annual_turnover: number | null;
  last_sale_date: string | null;
  days_since_last_sale: number | null;
  lead_time_days: number;
  stock_status: string;
};

export type InventorySummaryRow = {
  products: number;
  stock_value: number;
  uncosted_products: number;
  last_snapshot: string | null;
  oldest_snapshot: string | null;
  window_days: number | null;
  window_cogs: number | null;
  annual_turnover: number | null;
  sold_without_position: number;
  by_status: Json;
};

export type AnalyticsFunctions = {
  create_import: Rows<{
    import_id: string;
    object_path: string;
    previous_import_id: string | null;
    previous_import_at: string | null;
    previous_import_status: ImportStatusV2 | null;
  }>;
  confirm_import_upload: { Args: { p_import_id: string }; Returns: undefined };
  save_import_mapping: { Args: { p_import_id: string; p_mapping: Json; p_options: Json; p_sheet_name: string | null }; Returns: undefined };
  stage_import_batch: Rows<{ staged_rows: number; rejected_rows: number; warnings: number }>;
  finish_validation: { Args: { p_import_id: string; p_expected_batches: number }; Returns: Json };
  start_import: { Args: { p_import_id: string; p_duplicate_policy: string }; Returns: undefined };
  commit_import_batch: Rows<{ inserted_rows: number; skipped_rows: number }>;
  finalize_import: Rows<{ final_status: ImportStatusV2; inserted_rows: number; skipped_rows: number; rejected_rows: number }>;
  cancel_import: { Args: { p_import_id: string }; Returns: undefined };
  revert_import: { Args: { p_import_id: string }; Returns: number };
  save_analysis_settings: { Args: { p_organization_id: string; p_settings: Json }; Returns: undefined };
  analysis_parameters: Rows<AnalyticsParametersRow>;
  analytics_coverage: Rows<CoverageRow>;
  analytics_summary: Rows<SummaryRow>;
  analytics_daily: Rows<DailyRow>;
  analytics_products: Rows<ProductRow>;
  analytics_categories: Rows<GroupRow & { category_id: string | null; category_name: string | null }>;
  analytics_suppliers: Rows<GroupRow & { supplier_id: string | null; supplier_name: string | null }>;
  inventory_position: Rows<InventoryRow>;
  inventory_summary: Rows<InventorySummaryRow>;
  sync_opportunities: Rows<{ run_id: string; detected: number; created: number; updated: number; reopened: number; resolved: number }>;
  set_opportunity_status: { Args: { p_opportunity_id: string; p_status: OpportunityStatusDb; p_note: string | null }; Returns: undefined };
};

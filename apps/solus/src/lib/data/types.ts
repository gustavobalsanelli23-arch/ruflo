/**
 * Domain contracts consumed by the interface. The demo repository implements
 * them today; the real data layer (Supabase, Phase 02+) must return the same
 * shapes so no screen has to be rebuilt.
 *
 * Money is expressed in BRL (reais, not cents). Ratios are 0–1.
 * Dates are ISO strings (YYYY-MM-DD) interpreted in UTC.
 */

export type PeriodKey = '7d' | '30d' | '90d' | '12m' | 'ytd';
export type Granularity = 'day' | 'week' | 'month';

export interface Period {
  key: PeriodKey;
  label: string;
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  granularity: Granularity;
}

export interface Comparison {
  value: number;
  previous: number;
}

export type Tone = 'positive' | 'negative' | 'neutral';

export type Role = 'owner' | 'admin' | 'analyst' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  segment: string;
  city: string;
  state: string;
  timezone: string;
  currency: 'BRL';
  storeCount: number;
  isDemo: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  jobTitle: string;
}

export interface Workspace {
  organization: Organization;
  user: UserProfile;
  dataThrough: string;
  openOpportunities: number;
}

/* ---------- Executive Overview ---------- */

export interface TrendPoint {
  date: string;
  revenue: number;
  grossProfit: number;
  previousRevenue: number;
  orders: number;
}

export interface CategoryPerformance {
  categoryId: string;
  name: string;
  revenue: number;
  previousRevenue: number;
  grossProfit: number;
  margin: number;
  previousMargin: number;
  share: number;
}

export interface InventorySnapshot {
  stockValue: number;
  averageCoverageDays: number;
  ruptureRiskCount: number;
  stalledValue: number;
  stalledCount: number;
  skuCount: number;
  healthyShare: number;
  /** Items whose stock runs out before the next delivery, most urgent first. */
  ruptureItems: { productId: string; name: string; coverageDays: number; leadTimeDays: number }[];
}

/** Open opportunities in one line: how many, and what they are estimated to be worth. */
export interface OpportunitySummary {
  open: number;
  highPriority: number;
  monthlyImpact: number;
  oneOffImpact: number;
}

export type BriefingSegment =
  | { kind: 'text'; text: string }
  | { kind: 'figure'; text: string; tone?: Tone };

export interface ActivityItem {
  id: string;
  kind: 'import' | 'opportunity' | 'alert' | 'member' | 'analysis';
  title: string;
  detail: string;
  at: string;
  actor?: string;
}

export interface OverviewData {
  period: Period;
  briefing: BriefingSegment[];
  revenue: Comparison;
  grossProfit: Comparison;
  grossMargin: Comparison;
  averageTicket: Comparison;
  orders: Comparison;
  trend: TrendPoint[];
  categories: CategoryPerformance[];
  inventory: InventorySnapshot;
  opportunitySummary: OpportunitySummary;
  topOpportunities: Opportunity[];
  activity: ActivityItem[];
}

/* ---------- Profit Analytics ---------- */

export type MarginBand = 'negative' | 'low' | 'healthy';

export interface ProductProfit {
  productId: string;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  unitsSold: number;
  revenue: number;
  previousRevenue: number;
  grossProfit: number;
  margin: number;
  previousMargin: number;
  band: MarginBand;
}

export interface SupplierProfit {
  supplierId: string;
  name: string;
  revenue: number;
  grossProfit: number;
  margin: number;
  productCount: number;
}

export interface MarginPoint {
  date: string;
  margin: number;
  previousMargin: number;
}

export interface ProfitData {
  period: Period;
  lowMarginThreshold: number;
  grossProfit: Comparison;
  grossMargin: Comparison;
  revenue: Comparison;
  lowMarginCount: number;
  negativeMarginCount: number;
  marginTrend: MarginPoint[];
  categories: CategoryPerformance[];
  suppliers: SupplierProfit[];
  products: ProductProfit[];
}

/* ---------- Inventory Intelligence ---------- */

export type StockStatus = 'rupture-risk' | 'healthy' | 'low-turnover' | 'stalled';

export interface ProductStock {
  productId: string;
  sku: string;
  name: string;
  category: string;
  onHand: number;
  stockValue: number;
  dailyUnits: number;
  coverageDays: number | null;
  turnover: number;
  leadTimeDays: number;
  daysSinceLastSale: number;
  /** Replenished daily (bakery, produce): high turnover is expected, not a signal. */
  perishable: boolean;
  status: StockStatus;
}

export interface CoverageBucket {
  bucket: string;
  skuCount: number;
  stockValue: number;
}

export interface InventoryData {
  asOf: string;
  stockValue: number;
  immobilizedValue: number;
  averageCoverageDays: number;
  annualTurnover: number;
  ruptureRiskCount: number;
  stalledCount: number;
  lowTurnoverCount: number;
  coverage: CoverageBucket[];
  products: ProductStock[];
}

/* ---------- Opportunity Center ---------- */

export type OpportunityCategory = 'pricing' | 'inventory' | 'purchasing' | 'mix' | 'rupture';
export type Priority = 'high' | 'medium' | 'low';
export type OpportunityStatus = 'new' | 'reviewing' | 'in-progress' | 'done' | 'dismissed';

export interface Evidence {
  label: string;
  value: string;
  detail?: string;
  /** 'fact' is read from the data; 'estimate' depends on the stated assumptions. Defaults to fact. */
  basis?: 'fact' | 'estimate';
}

export interface EvidenceSeries {
  label: string;
  unit: 'currency' | 'percent' | 'units';
  points: { date: string; value: number }[];
}

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  impact: number;
  impactKind: 'monthly' | 'one-off';
  priority: Priority;
  confidence: number;
  status: OpportunityStatus;
  detectedAt: string;
  /** One line for cards and lists. */
  summary: string;
  /** What was identified, stated as facts from the data. */
  finding: string;
  /** Why it deserves attention now. */
  whyItMatters: string;
  /** Premises behind the estimated impact; the impact is never a guaranteed gain. */
  assumptions: string[];
  recommendation: string[];
  evidence: Evidence[];
  series?: EvidenceSeries;
  products: string[];
  /** Suggested analyst question that explores this opportunity, when one exists. */
  relatedQuestionId?: string;
}

/* ---------- AI Analyst ---------- */

export type AnswerBlock =
  | { kind: 'summary'; text: string }
  | { kind: 'metrics'; items: { label: string; value: string; delta?: string; tone?: Tone }[] }
  | { kind: 'chart'; title: string; unit: 'currency' | 'percent'; points: { label: string; value: number }[] }
  | {
      kind: 'table';
      title: string;
      columns: { key: string; label: string; align?: 'left' | 'right' }[];
      rows: Record<string, string>[];
      note?: string;
    }
  | { kind: 'findings'; facts: string[]; hypotheses: string[] }
  | { kind: 'recommendation'; items: string[] }
  | { kind: 'sources'; items: { name: string; detail: string }[] }
  | { kind: 'next'; items: string[] };

export interface AnalystMessage {
  id: string;
  role: 'user' | 'analyst';
  at: string;
  text?: string;
  blocks?: AnswerBlock[];
}

export interface AnalystThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: AnalystMessage[];
}

export interface SuggestedQuestion {
  id: string;
  theme: string;
  question: string;
}

export interface AnalystData {
  threads: AnalystThread[];
  suggestions: SuggestedQuestion[];
  scriptedAnswers: Record<string, AnswerBlock[]>;
}

/* ---------- Data Hub ---------- */

export type ImportStatus = 'completed' | 'processing' | 'with-errors' | 'failed';

export interface ImportRecord {
  id: string;
  fileName: string;
  format: 'csv' | 'xlsx';
  dataset: string;
  status: ImportStatus;
  records: number;
  errors: number;
  uploadedAt: string;
  uploadedBy: string;
  progress?: number;
}

export interface ColumnMapping {
  source: string;
  sample: string;
  target: string | null;
  confidence: number;
}

export interface ValidationIssue {
  row: number;
  column: string;
  value: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface DataHubData {
  imports: ImportRecord[];
  targetFields: { id: string; label: string; required: boolean }[];
  sample: {
    fileName: string;
    columns: string[];
    rows: string[][];
    totalRows: number;
    mapping: ColumnMapping[];
    issues: ValidationIssue[];
  };
}

/* ---------- Settings ---------- */

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'invited';
  lastActive: string | null;
}

export interface Permission {
  id: string;
  label: string;
  description: string;
  roles: Role[];
}

export interface SettingsData {
  organization: Organization;
  user: UserProfile;
  members: Member[];
  permissions: Permission[];
}

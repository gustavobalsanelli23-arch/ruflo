/**
 * Database types of billing (Stripe), merged into `Database` in ./database.ts.
 * Mirrors supabase/migrations/20261117100000_billing.sql.
 */

export type PlanEnum = 'free' | 'basic' | 'pro' | 'premium';

export type OrganizationBillingRow = {
  organization_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string | null;
  plan: PlanEnum | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
};

export type BillingTables = {
  organization_billing: {
    Row: OrganizationBillingRow;
    Insert: Record<string, never>;
    Update: Record<string, never>;
    Relationships: [];
  };
};

export type BillingFunctions = {
  link_billing_customer: {
    Args: { p_actor: string; p_organization_id: string; p_customer_id: string };
    Returns: undefined;
  };
  apply_subscription: {
    Args: {
      p_event_id: string;
      p_event_type: string;
      p_customer_id: string;
      p_subscription_id: string;
      p_status: string;
      p_plan: PlanEnum | null;
      p_current_period_end: string | null;
      p_cancel_at_period_end: boolean;
    };
    Returns: boolean;
  };
};

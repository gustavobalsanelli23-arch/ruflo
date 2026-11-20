import 'server-only';
import { getStripe, PAID_STATUSES } from '@/lib/billing/stripe';
import { logServerError } from '@/lib/log';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { SolusClient } from '@/lib/supabase/server';

/**
 * Ends an organization's Stripe account before the organization is deleted.
 * Deleting the Stripe customer cancels its subscriptions at once (so nothing
 * keeps charging a company that no longer exists) and erases the name and
 * e-mail Stripe received, as the privacy policy promises. The database
 * cascade cannot reach Stripe, and after the cascade SOLUS would no longer
 * know which customer to cancel.
 *
 * Then the billing row is marked canceled at once, without waiting for the
 * webhook: the database refuses to delete an organization whose billing is
 * still paid (private.guard_billing_closed), so a DELETE sent straight to the
 * API cannot skip this step.
 *
 * false means the organization must not be deleted yet (Stripe unreachable,
 * or a paid subscription with billing switched off).
 */
export async function closeBillingAccount(supabase: SolusClient, organizationId: string): Promise<boolean> {
  const { data: billing, error } = await supabase
    .from('organization_billing')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) {
    logServerError('cobrança: ler antes de excluir', error);
    return false;
  }
  if (!billing) return true;
  const paid = Boolean(billing.status && PAID_STATUSES.has(billing.status as never));

  const stripe = getStripe();
  if (!stripe) {
    if (paid) logServerError('cobrança: excluir com assinatura e Stripe desligada', new Error(organizationId));
    return !paid;
  }
  try {
    await stripe.customers.del(billing.stripe_customer_id);
  } catch (cause) {
    // Already gone (a previous attempt got this far): nothing left to cancel.
    if ((cause as { code?: string }).code !== 'resource_missing') {
      logServerError('cobrança: encerrar cliente', cause);
      return false;
    }
  }
  if (!paid) return true;

  const admin = createSupabaseAdminClient();
  if (!admin || !billing.stripe_subscription_id) {
    logServerError('cobrança: marcar encerrada', new Error(admin ? 'assinatura paga sem id' : 'sem chave de serviço'));
    return false;
  }
  // Same RPC the webhook uses; the event id is fixed per customer, so a retry
  // is a no-op, and the real Stripe event that follows finds no organization.
  const { error: marked } = await admin.rpc('apply_subscription', {
    p_event_id: `solus:closed:${billing.stripe_customer_id}`,
    p_event_type: 'solus.organization_closed',
    p_customer_id: billing.stripe_customer_id,
    p_subscription_id: billing.stripe_subscription_id,
    p_status: 'canceled',
    p_plan: null,
    p_current_period_end: null,
    p_cancel_at_period_end: false,
  });
  if (marked) {
    logServerError('cobrança: marcar encerrada', marked);
    return false;
  }
  return true;
}

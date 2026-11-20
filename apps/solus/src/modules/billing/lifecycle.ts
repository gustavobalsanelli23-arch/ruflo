import 'server-only';
import { getStripe, PAID_STATUSES } from '@/lib/billing/stripe';
import { logServerError } from '@/lib/log';
import type { SolusClient } from '@/lib/supabase/server';

/**
 * Ends an organization's Stripe account before the organization is deleted.
 * Deleting the Stripe customer cancels its subscriptions at once (so nothing
 * keeps charging a company that no longer exists) and erases the name and
 * e-mail Stripe received, as the privacy policy promises. The database
 * cascade cannot reach Stripe, and after the cascade SOLUS would no longer
 * know which customer to cancel.
 *
 * false means the organization must not be deleted yet (Stripe unreachable,
 * or a paid subscription with billing switched off).
 */
export async function closeBillingAccount(supabase: SolusClient, organizationId: string): Promise<boolean> {
  const { data: billing, error } = await supabase
    .from('organization_billing')
    .select('stripe_customer_id, status')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) {
    logServerError('cobrança: ler antes de excluir', error);
    return false;
  }
  if (!billing) return true;

  const stripe = getStripe();
  if (!stripe) {
    if (billing.status && PAID_STATUSES.has(billing.status as never)) {
      logServerError('cobrança: excluir com assinatura e Stripe desligada', new Error(organizationId));
      return false;
    }
    return true;
  }
  try {
    await stripe.customers.del(billing.stripe_customer_id);
    return true;
  } catch (cause) {
    // Already gone (a previous attempt got this far): nothing left to cancel.
    if ((cause as { code?: string }).code === 'resource_missing') return true;
    logServerError('cobrança: encerrar cliente', cause);
    return false;
  }
}

'use server';

import { z } from 'zod';
import { getStripe, isBillingEnabled, PRICE_LOOKUP_KEYS } from '@/lib/billing/stripe';
import { getSiteUrl } from '@/lib/env';
import { logServerError } from '@/lib/log';
import type { MappedError } from '@/lib/supabase/errors';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { authorize } from '@/services/workspace';

/**
 * Billing Server Actions. Only the owner of the active organization starts a
 * checkout or opens the billing portal; the organization comes from the
 * session, never from the browser. Each returns a Stripe URL for the browser
 * to open.
 */

type Result = { ok: true; url: string } | { ok: false; error: MappedError };

const planSchema = z.enum(['basic', 'pro', 'premium']);
const OFF: Result = { ok: false, error: { code: 'unavailable', message: 'A cobrança online ainda não está ativa.' } };
const FAILED: Result = {
  ok: false,
  error: { code: 'unavailable', message: 'Não foi possível falar com o sistema de pagamento. Tente de novo em instantes.' },
};

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused']);

export async function startCheckoutAction(plan: unknown): Promise<Result> {
  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return { ok: false, error: { code: 'validation', message: 'Plano inválido.' } };
  const stripe = getStripe();
  const admin = createSupabaseAdminClient();
  if (!isBillingEnabled() || !stripe || !admin) return OFF;

  const auth = await authorize('owner');
  if (!auth.ok) return auth;
  const { workspace, supabase } = auth;
  const { organizationId, name } = workspace.active;

  try {
    const { data: billing } = await supabase
      .from('organization_billing')
      .select('stripe_customer_id, stripe_subscription_id, status')
      .eq('organization_id', organizationId)
      .maybeSingle();

    // Already subscribed: changing or cancelling the plan happens in the portal,
    // so an organization never ends up with two subscriptions.
    if (billing?.stripe_subscription_id && billing.status && ACTIVE_STATUSES.has(billing.status)) {
      return portal(billing.stripe_customer_id);
    }

    let customerId = billing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { name, email: workspace.user.email, metadata: { organization_id: organizationId } },
        { idempotencyKey: `solus-customer-${organizationId}` },
      );
      const { error } = await admin.rpc('link_billing_customer', {
        p_actor: workspace.user.id,
        p_organization_id: organizationId,
        p_customer_id: customer.id,
      });
      if (error) throw error;
      customerId = customer.id;
    }

    const prices = await stripe.prices.list({ lookup_keys: [PRICE_LOOKUP_KEYS[parsed.data]], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) {
      logServerError('stripe: preço não encontrado', new Error(PRICE_LOOKUP_KEYS[parsed.data]));
      return FAILED;
    }

    const site = getSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: organizationId,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { metadata: { organization_id: organizationId } },
      locale: 'pt-BR',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${site}/configuracoes?secao=plano&cobranca=ok`,
      cancel_url: `${site}/configuracoes?secao=plano&cobranca=cancelado`,
    });
    if (!session.url) return FAILED;
    return { ok: true, url: session.url };
  } catch (error) {
    logServerError('stripe: checkout', error);
    return FAILED;
  }
}

export async function openBillingPortalAction(): Promise<Result> {
  if (!isBillingEnabled()) return OFF;
  const auth = await authorize('owner');
  if (!auth.ok) return auth;
  const { data: billing } = await auth.supabase
    .from('organization_billing')
    .select('stripe_customer_id')
    .eq('organization_id', auth.workspace.active.organizationId)
    .maybeSingle();
  if (!billing) return { ok: false, error: { code: 'validation', message: 'Esta organização ainda não tem assinatura.' } };
  return portal(billing.stripe_customer_id);
}

async function portal(customerId: string): Promise<Result> {
  const stripe = getStripe();
  if (!stripe) return OFF;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      locale: 'pt-BR',
      return_url: `${getSiteUrl()}/configuracoes?secao=plano`,
    });
    return { ok: true, url: session.url };
  } catch (error) {
    logServerError('stripe: portal', error);
    return FAILED;
  }
}

import 'server-only';
import Stripe from 'stripe';
import type { PlanId } from '@/config/plans';

/**
 * Stripe on the server. The secret key and the webhook secret live only in
 * the environment (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET); without them
 * billing is off and the pricing page keeps its manual flow.
 *
 * Prices are found by lookup key, not by id, so the same code works in test
 * and live mode: create one monthly BRL price per paid plan with these keys.
 */
export const PRICE_LOOKUP_KEYS: Record<Exclude<PlanId, 'free'>, string> = {
  basic: 'solus_basic_mensal',
  pro: 'solus_pro_mensal',
  premium: 'solus_premium_mensal',
};

export function planFromLookupKey(key: string | null | undefined): Exclude<PlanId, 'free'> | null {
  const entry = Object.entries(PRICE_LOOKUP_KEYS).find(([, value]) => value === key);
  return (entry?.[0] as Exclude<PlanId, 'free'> | undefined) ?? null;
}

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || !/^(sk|rk)_(test|live)_/.test(key)) return null;
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: 'SOLUS' } });
  return client;
}

export function getWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret && secret.startsWith('whsec_') ? secret : null;
}

export function isBillingEnabled() {
  return getStripe() !== null && getWebhookSecret() !== null;
}

/** The fields SOLUS keeps from a subscription, read straight from Stripe. */
export function subscriptionState(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const periodEnd = item?.current_period_end;
  return {
    customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    subscriptionId: subscription.id,
    status: subscription.status,
    plan: planFromLookupKey(item?.price.lookup_key),
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at !== null,
  };
}

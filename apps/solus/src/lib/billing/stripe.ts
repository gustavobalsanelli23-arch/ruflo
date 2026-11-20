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

/** Statuses in which the organization keeps the plan it subscribed to. */
export const PAID_STATUSES = new Set<Stripe.Subscription.Status>(['active', 'trialing', 'past_due']);

const PLAN_RANK: Record<Exclude<PlanId, 'free'>, number> = { basic: 1, pro: 2, premium: 3 };

const customerIdOf = (subscription: Stripe.Subscription) =>
  typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

/** The fields SOLUS keeps from a subscription, read straight from Stripe. */
export function subscriptionState(subscription: Stripe.Subscription, plan = planFromLookupKey(subscription.items.data[0]?.price.lookup_key)) {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return {
    customerId: customerIdOf(subscription),
    subscriptionId: subscription.id,
    status: subscription.status,
    plan,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at !== null,
  };
}

/**
 * The plan a subscription pays for. The lookup key says it for current
 * prices; a price created before a price change has lost its key (it moved
 * to the new price), so the product's `solus_plan` metadata, set by
 * scripts/stripe-setup.mjs, still names the plan.
 */
async function planOf(stripe: Stripe, subscription: Stripe.Subscription, products: Map<string, string | null>) {
  const price = subscription.items.data[0]?.price;
  const byKey = planFromLookupKey(price?.lookup_key);
  if (byKey || !price) return byKey;
  const product = price.product;
  const productId = typeof product === 'string' ? product : product.id;
  if (!products.has(productId)) {
    const meta = typeof product === 'string' ? (await stripe.products.retrieve(productId)).metadata : 'metadata' in product ? product.metadata : {};
    products.set(productId, meta?.solus_plan ?? null);
  }
  const named = products.get(productId);
  return named && named in PLAN_RANK ? (named as Exclude<PlanId, 'free'>) : null;
}

/**
 * The billing state of a Stripe customer, from all of its subscriptions,
 * not only the one an event is about. With more than one subscription
 * (two checkouts before the first webhook) the best paid one counts, so the
 * end of one never drops a plan the customer is still paying for.
 */
export async function customerBillingState(stripe: Stripe, subscription: Stripe.Subscription) {
  let listed: Stripe.Subscription[];
  try {
    listed = (await stripe.subscriptions.list({ customer: customerIdOf(subscription), status: 'all', limit: 100 })).data;
  } catch (cause) {
    // The customer was deleted (closeBillingAccount, when an organization
    // goes): only the subscription the event is about is left to report.
    if ((cause as { code?: string }).code !== 'resource_missing') throw cause;
    listed = [];
  }
  const all = listed.some((item) => item.id === subscription.id) ? listed : [subscription, ...listed];
  const products = new Map<string, string | null>();
  const states = await Promise.all(all.map(async (item) => subscriptionState(item, await planOf(stripe, item, products))));
  const paid = states.filter((state) => PAID_STATUSES.has(state.status));
  const chosen =
    paid.sort((a, b) => (b.plan ? PLAN_RANK[b.plan] : 0) - (a.plan ? PLAN_RANK[a.plan] : 0))[0] ??
    states.find((state) => state.subscriptionId === subscription.id)!;
  return { state: chosen, paidCount: paid.length };
}

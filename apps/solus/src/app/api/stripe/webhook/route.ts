import type Stripe from 'stripe';
import { getStripe, getWebhookSecret, subscriptionState } from '@/lib/billing/stripe';
import { logServerError } from '@/lib/log';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Stripe webhook. The signature is checked against the raw body; then, for
 * any event about a subscription, the subscription is read again from Stripe
 * and its current state applied, so events arriving late or out of order
 * cannot leave an old state behind.
 *
 * 2xx = handled or nothing to do; 400 = not from Stripe; 500 = try again
 * (Stripe retries for up to three days).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUBSCRIPTION_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
]);

function subscriptionIdOf(event: Stripe.Event): string | null {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.mode !== 'subscription' || !session.subscription) return null;
    return typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
  }
  if (SUBSCRIPTION_EVENTS.has(event.type)) return (event.data.object as Stripe.Subscription).id;
  return null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = getWebhookSecret();
  if (!stripe || !secret) return new Response('Cobrança desativada.', { status: 503 });

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Sem assinatura.', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response('Assinatura inválida.', { status: 400 });
  }

  const subscriptionId = subscriptionIdOf(event);
  if (!subscriptionId) return Response.json({ received: true, ignored: event.type });

  const admin = createSupabaseAdminClient();
  if (!admin) return new Response('Banco indisponível.', { status: 500 });

  try {
    const state = subscriptionState(await stripe.subscriptions.retrieve(subscriptionId));
    const { error } = await admin.rpc('apply_subscription', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_customer_id: state.customerId,
      p_subscription_id: state.subscriptionId,
      p_status: state.status,
      p_plan: state.plan,
      p_current_period_end: state.currentPeriodEnd,
      p_cancel_at_period_end: state.cancelAtPeriodEnd,
    });
    if (error) throw error;
  } catch (error) {
    logServerError(`stripe: ${event.type}`, error);
    return new Response('Falha ao aplicar.', { status: 500 });
  }
  return Response.json({ received: true });
}

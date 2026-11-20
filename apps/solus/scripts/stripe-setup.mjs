#!/usr/bin/env node
/**
 * Prepares a Stripe account for SOLUS, safe to run again (it reuses what exists):
 *   1. one product + one monthly BRL price per paid plan, with the lookup keys
 *      that src/lib/billing/stripe.ts looks for;
 *   2. the customer portal: change plan, update card, invoices, cancel with reason;
 *   3. (with --webhook <site>) the webhook endpoint, writing its signing secret
 *      to .env.local without printing it.
 *
 * Reads STRIPE_SECRET_KEY from .env.local (never from the command line, so it
 * stays out of the shell history). Use the test key (sk_test_…) first.
 *
 *   node scripts/stripe-setup.mjs
 *   node scripts/stripe-setup.mjs --webhook https://solus-psi.vercel.app
 */
import { readFileSync, writeFileSync } from 'node:fs';
import Stripe from 'stripe';

const ENV_FILE = new URL('../.env.local', import.meta.url);

// Keep in sync with src/config/plans.ts and PRICE_LOOKUP_KEYS.
const PLANS = [
  { id: 'basic', name: 'SOLUS Basic', amount: 49_00, lookupKey: 'solus_basic_mensal' },
  { id: 'pro', name: 'SOLUS Pro', amount: 149_00, lookupKey: 'solus_pro_mensal' },
  { id: 'premium', name: 'SOLUS Premium', amount: 399_00, lookupKey: 'solus_premium_mensal' },
];

const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
];

function readEnv() {
  try {
    return readFileSync(ENV_FILE, 'utf8');
  } catch {
    return '';
  }
}

function envValue(text, name) {
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') : '';
}

const key = envValue(readEnv(), 'STRIPE_SECRET_KEY');
if (!/^(sk|rk)_(test|live)_/.test(key)) {
  console.error('Coloque STRIPE_SECRET_KEY=sk_test_… em apps/solus/.env.local e rode de novo.');
  process.exit(1);
}
const live = key.includes('_live_');
const stripe = new Stripe(key);
console.log(`Stripe em modo ${live ? 'REAL' : 'de teste'}.`);

// 1. Products and prices
const priceIds = [];
for (const plan of PLANS) {
  const existing = await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true, expand: ['data.product'], limit: 1 });
  let price = existing.data[0];
  if (price && (price.unit_amount !== plan.amount || price.currency !== 'brl' || price.recurring?.interval !== 'month')) {
    console.log(`  ${plan.lookupKey}: valor mudou, criando preço novo e movendo a lookup key.`);
    price = undefined;
  }
  if (!price) {
    const products = await stripe.products.search({ query: `metadata['solus_plan']:'${plan.id}'`, limit: 1 });
    const product =
      products.data[0] ?? (await stripe.products.create({ name: plan.name, metadata: { solus_plan: plan.id } }));
    price = await stripe.prices.create({
      product: product.id,
      currency: 'brl',
      unit_amount: plan.amount,
      recurring: { interval: 'month' },
      lookup_key: plan.lookupKey,
      transfer_lookup_key: true,
      nickname: `${plan.name} mensal`,
    });
    console.log(`  ${plan.lookupKey}: criado (R$ ${plan.amount / 100}/mês).`);
  } else {
    console.log(`  ${plan.lookupKey}: já existe.`);
  }
  priceIds.push({ product: typeof price.product === 'string' ? price.product : price.product.id, prices: [price.id] });
}

// 2. Customer portal
const portal = {
  business_profile: { headline: 'SOLUS: gerencie sua assinatura' },
  features: {
    customer_update: { enabled: true, allowed_updates: ['name', 'email', 'address', 'tax_id'] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      cancellation_reason: {
        enabled: true,
        options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'too_complex', 'low_quality', 'other'],
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'],
      products: priceIds,
      // Upgrades are invoiced and charged at once: with deferred prorations an
      // upgrade followed by cancel-at-period-end would grant the plan unpaid.
      proration_behavior: 'always_invoice',
    },
  },
};
const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
if (configs.data[0]) await stripe.billingPortal.configurations.update(configs.data[0].id, portal);
else await stripe.billingPortal.configurations.create(portal);
console.log('  Portal do cliente configurado (troca de plano, cartão, faturas, cancelamento com motivo).');

// 3. Webhook
const site = process.argv[process.argv.indexOf('--webhook') + 1];
if (process.argv.includes('--webhook')) {
  if (!site || !/^https:\/\//.test(site)) {
    console.error('Use --webhook https://seu-site');
    process.exit(1);
  }
  const url = `${site.replace(/\/+$/, '')}/api/stripe/webhook`;
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const found = endpoints.data.find((e) => e.url === url);
  if (found) {
    await stripe.webhookEndpoints.update(found.id, { enabled_events: WEBHOOK_EVENTS });
    console.log(`  Webhook ${url} já existia; eventos atualizados. O segredo continua o mesmo.`);
  } else {
    const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: WEBHOOK_EVENTS, description: 'SOLUS' });
    const text = readEnv();
    const line = `STRIPE_WEBHOOK_SECRET=${endpoint.secret}`;
    const next = /^STRIPE_WEBHOOK_SECRET=.*$/m.test(text)
      ? text.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, line)
      : `${text.replace(/\s*$/, '')}\n${line}\n`;
    writeFileSync(ENV_FILE, next);
    console.log(`  Webhook ${url} criado. Segredo gravado em .env.local (STRIPE_WEBHOOK_SECRET).`);
  }
}
console.log('Pronto.');

import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc }) }));
vi.mock('@/lib/log', () => ({ logServerError: vi.fn() }));

const SECRET = 'whsec_teste';
const subscription = {
  id: 'sub_1',
  customer: 'cus_1',
  status: 'active',
  cancel_at_period_end: false,
  cancel_at: null,
  items: { data: [{ current_period_end: 1_800_000_000, price: { lookup_key: 'solus_pro_mensal' } }] },
};

beforeEach(() => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET);
  rpc.mockResolvedValue({ error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rpc.mockReset();
});

/** Stubs the Stripe reads the webhook makes: the event's subscription and the customer's list. */
async function stubRetrieve(list: object[] = [subscription], event: object = subscription) {
  const { getStripe } = await import('@/lib/billing/stripe');
  const stripe = getStripe()!;
  vi.spyOn(stripe.subscriptions, 'list').mockResolvedValue({ data: list } as never);
  return vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(event as never);
}

function signed(payload: object) {
  const body = JSON.stringify(payload);
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: SECRET });
  return new Request('https://solus.test/api/stripe/webhook', { method: 'POST', body, headers: { 'stripe-signature': header } });
}

describe('lookup keys e estado da assinatura', () => {
  it('liga cada preço ao plano e lê o fim do período no item', async () => {
    const { planFromLookupKey, subscriptionState } = await import('@/lib/billing/stripe');
    expect(planFromLookupKey('solus_basic_mensal')).toBe('basic');
    expect(planFromLookupKey('outro')).toBeNull();
    expect(subscriptionState(subscription as unknown as Stripe.Subscription)).toEqual({
      customerId: 'cus_1',
      subscriptionId: 'sub_1',
      status: 'active',
      plan: 'pro',
      currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    });
  });
});

describe('webhook da Stripe', () => {
  it('recusa o que não vem assinado pela Stripe', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(
      new Request('https://solus.test/api/stripe/webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=errado' } }),
    );
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('relê a assinatura na Stripe e aplica o estado atual', async () => {
    const retrieve = await stubRetrieve();
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(
      signed({ id: 'evt_1', object: 'event', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', object: 'subscription' } } }),
    );
    expect(response.status).toBe(200);
    expect(retrieve).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('apply_subscription', expect.objectContaining({ p_event_id: 'evt_1', p_plan: 'pro', p_status: 'active' }));
  });

  it('ignora eventos que não falam de assinatura', async () => {
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(signed({ id: 'evt_2', object: 'event', type: 'invoice.created', data: { object: {} } }));
    expect(response.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('pede nova tentativa (500) quando o banco falha', async () => {
    await stubRetrieve();
    rpc.mockResolvedValue({ error: { message: 'falhou' } });
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(
      signed({ id: 'evt_3', object: 'event', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', object: 'subscription' } } }),
    );
    expect(response.status).toBe(500);
  });

  it('depois de uma troca de preço (sem lookup key) lê o plano no produto e não rebaixa', async () => {
    const legacy = { ...subscription, items: { data: [{ current_period_end: 1_800_000_000, price: { lookup_key: null, product: 'prod_pro' } }] } };
    await stubRetrieve([legacy], legacy);
    const { getStripe } = await import('@/lib/billing/stripe');
    vi.spyOn(getStripe()!.products, 'retrieve').mockResolvedValue({ id: 'prod_pro', metadata: { solus_plan: 'pro' } } as never);
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(
      signed({ id: 'evt_4', object: 'event', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', object: 'subscription' } } }),
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('apply_subscription', expect.objectContaining({ p_plan: 'pro', p_status: 'active' }));
  });

  it('com duas assinaturas, o fim de uma não derruba o plano que a outra ainda paga', async () => {
    const ended = { ...subscription, id: 'sub_2', status: 'canceled', items: { data: [{ current_period_end: 1_800_000_000, price: { lookup_key: 'solus_basic_mensal' } }] } };
    const premium = { ...subscription, items: { data: [{ current_period_end: 1_800_000_000, price: { lookup_key: 'solus_premium_mensal' } }] } };
    await stubRetrieve([ended, premium], ended);
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(
      signed({ id: 'evt_5', object: 'event', type: 'customer.subscription.deleted', data: { object: { id: 'sub_2', object: 'subscription' } } }),
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('apply_subscription', expect.objectContaining({ p_subscription_id: 'sub_1', p_plan: 'premium', p_status: 'active' }));
  });

  it('assinatura paga de um plano desconhecido não rebaixa ninguém: pede nova tentativa', async () => {
    const unknown = { ...subscription, items: { data: [{ current_period_end: 1_800_000_000, price: { lookup_key: 'outro', product: { id: 'prod_x', metadata: {} } } }] } };
    await stubRetrieve([unknown], unknown);
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(
      signed({ id: 'evt_6', object: 'event', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', object: 'subscription' } } }),
    );
    expect(response.status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('cliente já apagado (organização excluída): aplica só a assinatura do evento, sem pedir nova tentativa', async () => {
    const canceled = { ...subscription, status: 'canceled' };
    const { getStripe } = await import('@/lib/billing/stripe');
    const stripe = getStripe()!;
    vi.spyOn(stripe.subscriptions, 'list').mockRejectedValue(Object.assign(new Error('No such customer'), { code: 'resource_missing' }));
    vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(canceled as never);
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const response = await POST(
      signed({ id: 'evt_7', object: 'event', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', object: 'subscription' } } }),
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('apply_subscription', expect.objectContaining({ p_subscription_id: 'sub_1', p_status: 'canceled' }));
  });
});

describe('encerrar a cobrança antes de excluir a organização', () => {
  function client(row: object | null, error: object | null = null) {
    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: row, error }) };
    return { from: () => chain } as never;
  }

  it('apaga o cliente na Stripe, o que cancela a assinatura e os dados dele', async () => {
    const { getStripe } = await import('@/lib/billing/stripe');
    const del = vi.spyOn(getStripe()!.customers, 'del').mockResolvedValue({ id: 'cus_1', deleted: true } as never);
    const { closeBillingAccount } = await import('@/modules/billing/lifecycle');
    expect(await closeBillingAccount(client({ stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', status: 'active' }), 'org')).toBe(true);
    expect(del).toHaveBeenCalledWith('cus_1');
    // Marked canceled at once, so the database lets the organization go.
    expect(rpc).toHaveBeenCalledWith(
      'apply_subscription',
      expect.objectContaining({ p_event_id: 'solus:closed:cus_1', p_customer_id: 'cus_1', p_subscription_id: 'sub_1', p_status: 'canceled' }),
    );
  });

  it('se não consegue marcar a cobrança como encerrada, a organização não é excluída', async () => {
    const { getStripe } = await import('@/lib/billing/stripe');
    vi.spyOn(getStripe()!.customers, 'del').mockResolvedValue({ id: 'cus_1', deleted: true } as never);
    rpc.mockResolvedValue({ error: { message: 'falhou' } });
    const { closeBillingAccount } = await import('@/modules/billing/lifecycle');
    expect(await closeBillingAccount(client({ stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', status: 'active' }), 'org')).toBe(false);
  });

  it('cobrança já encerrada: apaga o cliente e não precisa marcar nada', async () => {
    const { getStripe } = await import('@/lib/billing/stripe');
    vi.spyOn(getStripe()!.customers, 'del').mockResolvedValue({ id: 'cus_1', deleted: true } as never);
    const { closeBillingAccount } = await import('@/modules/billing/lifecycle');
    expect(await closeBillingAccount(client({ stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', status: 'canceled' }), 'org')).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sem cobrança registrada, segue sem chamar a Stripe', async () => {
    const { getStripe } = await import('@/lib/billing/stripe');
    const del = vi.spyOn(getStripe()!.customers, 'del');
    const { closeBillingAccount } = await import('@/modules/billing/lifecycle');
    expect(await closeBillingAccount(client(null), 'org')).toBe(true);
    expect(del).not.toHaveBeenCalled();
  });

  it('se a Stripe falha, a organização não é excluída', async () => {
    const { getStripe } = await import('@/lib/billing/stripe');
    vi.spyOn(getStripe()!.customers, 'del').mockRejectedValue(Object.assign(new Error('fora do ar'), { code: 'api_error' }));
    const { closeBillingAccount } = await import('@/modules/billing/lifecycle');
    expect(await closeBillingAccount(client({ stripe_customer_id: 'cus_1', status: 'active' }), 'org')).toBe(false);
  });

  it('cliente já apagado numa tentativa anterior: segue', async () => {
    const { getStripe } = await import('@/lib/billing/stripe');
    vi.spyOn(getStripe()!.customers, 'del').mockRejectedValue(Object.assign(new Error('No such customer'), { code: 'resource_missing' }));
    const { closeBillingAccount } = await import('@/modules/billing/lifecycle');
    expect(await closeBillingAccount(client({ stripe_customer_id: 'cus_1', status: 'canceled' }), 'org')).toBe(true);
  });
});

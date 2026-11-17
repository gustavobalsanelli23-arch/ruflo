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

async function stubRetrieve() {
  const { getStripe } = await import('@/lib/billing/stripe');
  return vi.spyOn(getStripe()!.subscriptions, 'retrieve').mockResolvedValue(subscription as never);
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
});

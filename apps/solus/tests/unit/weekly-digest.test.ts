import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/log', () => ({ logServerError: vi.fn(), logSecurityEvent: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => null }));

const totals = (netRevenue: number, grossProfit: number, orders: number) => ({
  grossRevenue: netRevenue,
  discounts: 0,
  returns: 0,
  netRevenue,
  costedNetRevenue: netRevenue,
  cogs: netRevenue - grossProfit,
  grossProfit,
  grossMargin: grossProfit / netRevenue,
  costCoverage: 1,
  orders,
  averageTicket: netRevenue / orders,
  unitsSold: orders,
  saleLines: orders,
  activeDays: 7,
  catalogCostLines: 0,
  uncostedLines: 0,
});

const overview = {
  period: { key: '7d', label: 'Últimos 7 dias', start: '2026-11-13', end: '2026-11-19', previousStart: '2026-11-06', previousEnd: '2026-11-12', granularity: 'day' },
  current: totals(52_000, 20_500, 900),
  previous: totals(50_000, 19_000, 880),
  trend: [],
  marginTrend: [],
  categories: [],
  inventory: null,
  opportunities: {
    summary: { open: 2, highPriority: 1, monthlyImpact: 1650, oneOffImpact: 0 },
    top: [{ id: 'a', title: 'Renegociar o reajuste <de> 9%', impact: 1650, impactKind: 'monthly', priority: 'high' }],
  },
  activity: [],
  limitations: [],
} as never;

afterEach(() => vi.unstubAllEnvs());

describe('resumo semanal por e-mail', () => {
  it('monta assunto, texto e HTML com os números da semana e o link para sair', async () => {
    const { buildDigestEmail } = await import('@/services/weekly-digest');
    const raw = buildDigestEmail('Empório <Lumen>', overview, 'https://solus.example');
    // Intl puts a no-break space between R$ and the number.
    const plain = (text: string) => text.replace(/ /g, ' ');
    const email = { subject: plain(raw.subject), text: plain(raw.text), html: plain(raw.html) };
    expect(email.subject).toBe('Empório <Lumen>: R$ 52.000 em vendas nos últimos 7 dias');
    expect(email.text).toContain('Receita líquida: R$ 52.000 (+4,0% contra a semana anterior)');
    expect(email.text).toContain('https://solus.example/configuracoes?secao=privacidade');
    // HTML escapes what comes from the data.
    expect(email.html).toContain('Empório &#60;Lumen&#62;');
    expect(email.html).toContain('Renegociar o reajuste &#60;de&#62; 9%');
    expect(email.html).not.toContain('<Lumen>');
  });

  it('fica desligado sem as três variáveis e só aceita o segredo do agendador', async () => {
    const { isCronRequest, isDigestConfigured } = await import('@/services/weekly-digest');
    expect(isDigestConfigured()).toBe(false);
    expect(isCronRequest('Bearer x')).toBe(false);
    vi.stubEnv('RESEND_API_KEY', 're_teste');
    vi.stubEnv('DIGEST_FROM', 'SOLUS <resumo@solus.example>');
    vi.stubEnv('CRON_SECRET', 'segredo-longo');
    expect(isDigestConfigured()).toBe(true);
    expect(isCronRequest('Bearer segredo-longo')).toBe(true);
    expect(isCronRequest('Bearer outro')).toBe(false);
    expect(isCronRequest(null)).toBe(false);
  });

  it('a rota recusa quem não é o agendador e não envia nada desligada', async () => {
    vi.stubEnv('CRON_SECRET', 'segredo-longo');
    const { GET } = await import('@/app/api/cron/resumo-semanal/route');
    expect((await GET(new Request('https://solus.example/api/cron/resumo-semanal'))).status).toBe(401);
    const off = await GET(new Request('https://solus.example/api/cron/resumo-semanal', { headers: { authorization: 'Bearer segredo-longo' } }));
    expect(await off.json()).toEqual({ status: 'off' });
  });
});

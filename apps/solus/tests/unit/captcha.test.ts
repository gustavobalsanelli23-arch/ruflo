import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildContentSecurityPolicy } from '@/lib/security/headers';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/log', () => ({ logServerError: vi.fn(), logSecurityEvent: vi.fn() }));

const form = (token?: string) => {
  const data = new FormData();
  if (token !== undefined) data.set('cf-turnstile-response', token);
  return data;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Turnstile', () => {
  it('desligado sem as duas chaves: não chama a Cloudflare', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { verifyCaptcha } = await import('@/services/captcha');
    expect(await verifyCaptcha(form(), '203.0.113.1')).toBe('ok');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('com as chaves, exige o token e confere na Cloudflare', async () => {
    vi.stubEnv('TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'segredo-de-teste');
    const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    vi.stubGlobal('fetch', fetch);
    const { verifyCaptcha } = await import('@/services/captcha');
    expect(await verifyCaptcha(form(), '203.0.113.1')).toBe('failed');
    expect(await verifyCaptcha(form('tok'), '203.0.113.1')).toBe('ok');
    const body = (fetch.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(body.get('response')).toBe('tok');
    expect(body.get('remoteip')).toBe('203.0.113.1');
  });

  it('token recusado vira failed; Cloudflare fora do ar vira unavailable (não deixa passar)', async () => {
    vi.stubEnv('TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'segredo-de-teste');
    const { verifyCaptcha } = await import('@/services/captcha');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false }))));
    expect(await verifyCaptcha(form('tok'), 'unknown')).toBe('failed');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('rede'); }));
    expect(await verifyCaptcha(form('tok'), 'unknown')).toBe('unavailable');
  });

  it('o CSP só libera o quadro da Cloudflare quando o Turnstile está ligado', () => {
    expect(buildContentSecurityPolicy('n', false)).toContain("frame-src 'self';");
    expect(buildContentSecurityPolicy('n', false, null, false, false, true)).toContain("frame-src 'self' https://challenges.cloudflare.com");
  });
});

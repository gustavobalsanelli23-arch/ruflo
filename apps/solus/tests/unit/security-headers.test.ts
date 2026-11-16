import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, isLoopbackHost } from '@/lib/security/headers';

describe('buildContentSecurityPolicy', () => {
  it('em produção, pede ao navegador que troque http por https', () => {
    expect(buildContentSecurityPolicy('n', false)).toContain('upgrade-insecure-requests');
  });

  it('em desenvolvimento, não troca e libera o eval do recarregamento', () => {
    const csp = buildContentSecurityPolicy('n', true);
    expect(csp).not.toContain('upgrade-insecure-requests');
    expect(csp).toContain("'unsafe-eval'");
  });

  it('num build de produção servido em loopback, não troca (o Safari quebraria os scripts)', () => {
    const csp = buildContentSecurityPolicy('n', false, null, true);
    expect(csp).not.toContain('upgrade-insecure-requests');
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("'nonce-n' 'strict-dynamic'");
  });

  it('só libera o PostHog (EU) quando a análise de uso está configurada', () => {
    expect(buildContentSecurityPolicy('n', false)).not.toContain('posthog');
    const csp = buildContentSecurityPolicy('n', false, 'https://x.supabase.co', false, true);
    expect(csp).toContain("connect-src 'self' https://x.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com");
  });
});

describe('isLoopbackHost', () => {
  it.each(['localhost', '127.0.0.1', '[::1]', '::1'])('%s é loopback', (host) => {
    expect(isLoopbackHost(host)).toBe(true);
  });

  it.each(['solus.app', 'localhost.evil.example', '192.168.0.10', '127.0.0.1.nip.io', ''])('%s não é loopback', (host) => {
    expect(isLoopbackHost(host)).toBe(false);
  });
});

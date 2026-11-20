import { describe, expect, it } from 'vitest';
import { SESSION_IDLE, SESSION_MAX_AGE, sessionExpired, signedInAt } from '@/lib/auth/session-expiry';
import { isSecretPage, redactEvent, redactUrl } from '@/lib/tracking/redact';

const TOKEN = 'a'.repeat(64);

describe('nada de token na análise de uso', () => {
  it('tira token_hash, code e next da query e o token do caminho do convite', () => {
    expect(redactUrl('https://solus.app/auth/confirm?token_hash=abc123&type=recovery')).toBe('https://solus.app/auth/confirm?token_hash=[removido]&type=recovery');
    expect(redactUrl('https://solus.app/auth/confirm?code=xyz&fluxo=recuperacao')).toBe('https://solus.app/auth/confirm?code=[removido]&fluxo=recuperacao');
    expect(redactUrl(`/convite/${TOKEN}`)).toBe('/convite/:token');
    expect(redactUrl(`https://solus.app/entrar?next=%2Fconvite%2F${TOKEN}`)).not.toContain(TOKEN);
    expect(redactUrl('https://solus.app/visao-geral?periodo=30d')).toBe('https://solus.app/visao-geral?periodo=30d');
  });

  it('limpa todas as propriedades do evento, inclusive $set_once', () => {
    const event = {
      event: '$pageview',
      properties: { $current_url: `https://solus.app/convite/${TOKEN}`, $pathname: `/convite/${TOKEN}`, nested: { $referrer: 'https://solus.app/auth/confirm?token_hash=t0k3n' } },
      $set_once: { $initial_current_url: 'https://solus.app/auth/confirm?token_hash=t0k3n' },
    };
    const out = JSON.stringify(redactEvent(event, { pathname: '/visao-geral', search: '' }));
    expect(out).not.toContain(TOKEN);
    expect(out).not.toContain('t0k3n');
  });

  it('descarta quadros da gravação de sessão nas páginas com token', () => {
    const frame = { event: '$snapshot', properties: { $snapshot_data: [] } };
    expect(redactEvent(frame, { pathname: '/auth/confirm', search: '?token_hash=x' })).toBeNull();
    expect(redactEvent(frame, { pathname: `/convite/${TOKEN}`, search: '' })).toBeNull();
    expect(redactEvent(frame, { pathname: '/visao-geral', search: '' })).toBe(frame);
    expect(isSecretPage('/entrar', '')).toBe(false);
  });
});

describe('expiração da sessão', () => {
  const now = 2_000_000_000;

  it('lê a hora do login no amr, não no iat (que muda a cada renovação)', () => {
    expect(signedInAt({ iat: now, amr: [{ method: 'password', timestamp: now - 100 }] })).toBe(now - 100);
    expect(signedInAt({ iat: now })).toBe(now);
  });

  it('encerra depois do prazo máximo, mesmo com uso contínuo', () => {
    const claims = { amr: [{ method: 'password', timestamp: now - SESSION_MAX_AGE - 1 }] };
    expect(sessionExpired(claims, String(now - 10), now)).toBe('max-age');
  });

  it('encerra por inatividade e mantém quem está usando', () => {
    const claims = { amr: [{ method: 'password', timestamp: now - 2 * SESSION_IDLE }] };
    expect(sessionExpired(claims, String(now - SESSION_IDLE - 1), now)).toBe('idle');
    expect(sessionExpired(claims, String(now - 60), now)).toBeNull();
    // Cookie de atividade já expirado (ausente) depois de um login antigo: ficou parada.
    expect(sessionExpired(claims, undefined, now)).toBe('idle');
  });

  it('login recente sem o cookie de atividade ainda vale', () => {
    expect(sessionExpired({ amr: [{ method: 'password', timestamp: now - 30 }] }, undefined, now)).toBeNull();
    expect(sessionExpired({ amr: [{ method: 'password', timestamp: now - 30 }] }, 'lixo', now)).toBeNull();
  });
});

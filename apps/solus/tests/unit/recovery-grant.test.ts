import { describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

const { isValidRecoveryGrant, recoveryGrantValue, RECOVERY_WINDOW_SECONDS } = await import('@/services/recovery');

describe('permissão de recuperação de senha', () => {
  const now = 1_800_000_000;

  it('vale para a conta e a janela em que foi emitida', () => {
    const value = recoveryGrantValue('u1', now);
    expect(isValidRecoveryGrant(value, 'u1', now + 60)).toBe(true);
    expect(isValidRecoveryGrant(value, 'u1', now + RECOVERY_WINDOW_SECONDS)).toBe(true);
  });

  it('o id do usuário sozinho (o que qualquer sessão conhece) não vale', () => {
    expect(isValidRecoveryGrant('u1', 'u1', now)).toBe(false);
    expect(isValidRecoveryGrant(`u1.${now}`, 'u1', now)).toBe(false);
    expect(isValidRecoveryGrant(`u1.${now}.forjado`, 'u1', now)).toBe(false);
  });

  it('não vale para outra conta, depois da janela, nem com horário trocado', () => {
    const value = recoveryGrantValue('u1', now);
    expect(isValidRecoveryGrant(value, 'u2', now)).toBe(false);
    expect(isValidRecoveryGrant(value, 'u1', now + RECOVERY_WINDOW_SECONDS + 1)).toBe(false);
    const [, , mac] = value.split('.');
    expect(isValidRecoveryGrant(`u1.${now + 3600}.${mac}`, 'u1', now + 3600)).toBe(false);
    expect(isValidRecoveryGrant(undefined, 'u1', now)).toBe(false);
  });
});

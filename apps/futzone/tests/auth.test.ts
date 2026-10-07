import { pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readAuthConfig, isAuthReady } from '@/lib/auth/config';
import { hashPassword, passwordProblems, verifyPassword } from '@/lib/auth/password';
import { createMemoryRateLimiter } from '@/lib/auth/rateLimit';
import { signToken, verifyToken } from '@/lib/auth/token';
import { resolveSession } from '@/lib/auth/verify';
import type { AdminTokenPayload } from '@/lib/auth/types';

const SECRET = 'x'.repeat(48);
const now = Math.floor(Date.now() / 1000);
const payload = (over: Partial<AdminTokenPayload> = {}): AdminTokenPayload => ({ sub: 'admin-1', role: 'ADMIN', sid: 's1', iat: now, exp: now + 3600, ver: '1', ...over });

describe('senhas', () => {
  it('gera hash com salt aleatório e verifica corretamente', async () => {
    const a = await hashPassword('Senha-Forte-123', 100_000);
    const b = await hashPassword('Senha-Forte-123', 100_000);
    expect(a).not.toBe(b);
    expect(a).not.toContain('Senha-Forte-123');
    expect(await verifyPassword('Senha-Forte-123', a)).toBe(true);
    expect(await verifyPassword('senha-forte-123', a)).toBe(false);
    expect(await verifyPassword('qualquer', 'texto-invalido')).toBe(false);
  });

  it('aceita hash gerado pelo script de linha de comando (node:crypto)', async () => {
    const salt = Buffer.from('0123456789abcdef');
    const hash = pbkdf2Sync('Camisa-FutZone-2026', salt, 100_000, 32, 'sha256');
    const stored = `pbkdf2-sha256:100000:${salt.toString('base64url')}:${hash.toString('base64url')}`;
    expect(await verifyPassword('Camisa-FutZone-2026', stored)).toBe(true);
  });

  it('exige senha forte', () => {
    expect(passwordProblems('123')).not.toHaveLength(0);
    expect(passwordProblems('Camisa-FutZone-2026')).toHaveLength(0);
  });
});

describe('token de sessão', () => {
  it('aceita token íntegro e rejeita adulteração, outra chave, expiração e role diferente', async () => {
    const token = await signToken(payload(), SECRET);
    expect((await verifyToken(token, SECRET))?.sub).toBe('admin-1');
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify(payload({ sub: 'admin-2' }))).toString('base64url');
    expect(await verifyToken(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(await verifyToken(`${body}.${sig}x`, SECRET)).toBeNull();
    expect(await verifyToken(token, 'y'.repeat(48))).toBeNull();
    expect(await verifyToken(await signToken(payload({ exp: now - 1 }), SECRET), SECRET)).toBeNull();
    expect(await verifyToken(await signToken(payload({ role: 'CUSTOMER' as 'ADMIN' }), SECRET), SECRET)).toBeNull();
    expect(await verifyToken(undefined, SECRET)).toBeNull();
  });
});

describe('configuração dos administradores', () => {
  it('aceita no máximo 2 administradores, cada um com conta própria', async () => {
    const hash = await hashPassword('Camisa-FutZone-2026', 100_000);
    const env = {
      FUTZONE_ADMIN_1_EMAIL: 'um@futzone.com', FUTZONE_ADMIN_1_PASSWORD_HASH: hash, FUTZONE_ADMIN_1_NAME: 'Admin 1',
      FUTZONE_ADMIN_2_EMAIL: 'UM@futzone.com', FUTZONE_ADMIN_2_PASSWORD_HASH: hash,
      FUTZONE_ADMIN_3_EMAIL: 'tres@futzone.com', FUTZONE_ADMIN_3_PASSWORD_HASH: hash,
      FUTZONE_ADMIN_SESSION_SECRET: SECRET,
    };
    const config = readAuthConfig(env);
    expect(config.admins.map((a) => a.email)).toEqual(['um@futzone.com']);
    expect(config.problems.some((p) => p.includes('repetido'))).toBe(true);
    expect(isAuthReady(config)).toBe(true);
    expect(isAuthReady(readAuthConfig({}))).toBe(false);
  });

  it('sessão só vale para administrador configurado e versão atual', async () => {
    const hash = await hashPassword('Camisa-FutZone-2026', 100_000);
    const config = readAuthConfig({ FUTZONE_ADMIN_1_EMAIL: 'um@futzone.com', FUTZONE_ADMIN_1_PASSWORD_HASH: hash, FUTZONE_ADMIN_SESSION_SECRET: SECRET });
    expect((await resolveSession(await signToken(payload(), SECRET), config))?.admin.name).toBe('Admin 1');
    expect(await resolveSession(await signToken(payload({ sub: 'admin-2' }), SECRET), config)).toBeNull();
    expect(await resolveSession(await signToken(payload({ ver: '0' }), SECRET), config)).toBeNull();
  });
});

describe('limite de tentativas', () => {
  it('bloqueia após 5 falhas e libera depois da janela', () => {
    const l = createMemoryRateLimiter(5, 1000);
    for (let i = 0; i < 5; i++) l.fail('k', 0);
    expect(l.check('k', 10).allowed).toBe(false);
    expect(l.check('k', 2000).allowed).toBe(true);
  });
});

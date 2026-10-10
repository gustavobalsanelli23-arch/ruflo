import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readAuthConfig } from '@/lib/auth/config';
import { hashPassword } from '@/lib/auth/password';
import { createMemoryRevocationStore } from '@/lib/auth/revocation';
import { isSameOriginRequest } from '@/lib/auth/origin';
import { signToken } from '@/lib/auth/token';
import { resolveSession } from '@/lib/auth/verify';
import type { AdminTokenPayload } from '@/lib/auth/types';

const SRC = join(__dirname, '..', 'src');
const SECRET = 'k'.repeat(48);
const nowSec = Math.floor(Date.now() / 1000);
const payload = (over: Partial<AdminTokenPayload> = {}): AdminTokenPayload => ({ sub: 'admin-1', role: 'ADMIN', sid: 'sessao-1', iat: nowSec, exp: nowSec + 3600, ver: '1', ...over });

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
const read = (path: string) => readFileSync(path, 'utf8');

async function configWithTwoAdmins() {
  const hash = await hashPassword('Camisa-FutZone-2026', 100_000);
  return readAuthConfig({
    FUTZONE_ADMIN_1_EMAIL: 'um@futzone.com', FUTZONE_ADMIN_1_PASSWORD_HASH: hash,
    FUTZONE_ADMIN_2_EMAIL: 'dois@futzone.com', FUTZONE_ADMIN_2_PASSWORD_HASH: hash,
    FUTZONE_ADMIN_SESSION_SECRET: SECRET,
  });
}

describe('autorização no servidor', () => {
  it('libera somente as duas contas configuradas no servidor', async () => {
    const config = await configWithTwoAdmins();
    const store = createMemoryRevocationStore();
    expect(config.admins.map((a) => a.id)).toEqual(['admin-1', 'admin-2']);
    expect(await resolveSession(await signToken(payload(), SECRET), config, Date.now(), store)).not.toBeNull();
    expect(await resolveSession(await signToken(payload({ sub: 'admin-2' }), SECRET), config, Date.now(), store)).not.toBeNull();
    // Id de cliente, mesmo com token assinado e role ADMIN, não é administrador.
    expect(await resolveSession(await signToken(payload({ sub: 'c-001' }), SECRET), config, Date.now(), store)).toBeNull();
  });

  it('recusa role diferente de ADMIN e tokens criados fora do servidor', async () => {
    const config = await configWithTwoAdmins();
    const store = createMemoryRevocationStore();
    const asCustomer = await signToken(payload({ role: 'CUSTOMER' as 'ADMIN' }), SECRET);
    const forgedSecret = await signToken(payload(), 'segredo-adivinhado'.padEnd(48, '!'));
    const unsigned = Buffer.from(JSON.stringify(payload())).toString('base64url');
    for (const token of [asCustomer, forgedSecret, unsigned, `${unsigned}.`, 'ADMIN', undefined]) {
      expect(await resolveSession(token, config, Date.now(), store)).toBeNull();
    }
  });

  it('logout revoga a sessão: o mesmo token deixa de valer', async () => {
    const config = await configWithTwoAdmins();
    const store = createMemoryRevocationStore();
    const token = await signToken(payload({ sid: 'sessao-logout' }), SECRET);
    expect(await resolveSession(token, config, Date.now(), store)).not.toBeNull();
    await store.revoke('sessao-logout', nowSec + 3600);
    expect(await resolveSession(token, config, Date.now(), store)).toBeNull();
    // Outra sessão do mesmo administrador continua válida.
    expect(await resolveSession(await signToken(payload({ sid: 'outra' }), SECRET), config, Date.now(), store)).not.toBeNull();
  });

  it('a revogação some depois que o token expiraria (sem crescer para sempre)', async () => {
    const store = createMemoryRevocationStore();
    await store.revoke('s', 100);
    expect(await store.isRevoked('s', 99)).toBe(true);
    expect(await store.isRevoked('s', 100)).toBe(false);
  });

  it('escrita administrativa só com origem do próprio site', () => {
    const h = (o: Record<string, string>) => new Headers(o);
    expect(isSameOriginRequest(h({ origin: 'https://futzone.com.br', host: 'futzone.com.br' }))).toBe(true);
    expect(isSameOriginRequest(h({ origin: 'https://ataque.com', host: 'futzone.com.br' }))).toBe(false);
    expect(isSameOriginRequest(h({ host: 'futzone.com.br' }))).toBe(false);
  });
});

describe('cobertura das rotas administrativas', () => {
  it('o proxy cobre /admin, subrotas e APIs administrativas', () => {
    const proxy = read(join(SRC, 'proxy.ts'));
    for (const m of ["'/admin'", "'/admin/:path*'", "'/api/admin/:path*'"]) expect(proxy).toContain(m);
  });

  it('o layout do painel valida a sessão no servidor', () => {
    expect(read(join(SRC, 'app/admin/(painel)/layout.tsx'))).toContain('await requireAdmin()');
  });

  it('toda página do painel fica sob o layout protegido', () => {
    const pages = files(join(SRC, 'app/admin')).filter((f) => f.endsWith('page.tsx')).map((f) => relative(join(SRC, 'app/admin'), f));
    expect(pages.filter((p) => !p.startsWith('(painel)/'))).toEqual(['login/page.tsx']);
  });

  it('toda API administrativa (exceto login/logout) exige sessão de ADMIN', () => {
    const routes = files(join(SRC, 'app/api/admin')).filter((f) => f.endsWith('route.ts'));
    for (const route of routes) {
      const name = relative(SRC, route);
      if (/\/(login|logout)\/route\.ts$/.test(name)) continue;
      expect(read(route), name).toContain('requireAdminApi()');
    }
  });
});

describe('separação entre loja e painel', () => {
  const publicFiles = files(SRC).filter(
    (f) => /\.(tsx?|ts)$/.test(f) && !/\/(admin|auth)\//.test(relative(SRC, f).replace(/^/, '/')) && !/\/api\//.test(f) && !f.endsWith('proxy.ts'),
  );

  it('nenhum link para /admin na navegação pública ou na conta do cliente', () => {
    const offenders = publicFiles.filter((f) => /href=["'{`]+\/admin|['"`]\/admin['"`/]/.test(read(f)));
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });

  it('contas de clientes nunca recebem a role ADMIN', () => {
    const customerCode = [
      ...files(join(SRC, 'services/auth')),
      join(SRC, 'context/CustomerAuthContext.tsx'),
      join(SRC, 'types/commerce.ts'),
      ...files(join(SRC, 'components/auth')),
      ...files(join(SRC, 'components/account')),
    ];
    for (const f of customerCode) {
      const code = read(f);
      expect(code, relative(SRC, f)).not.toMatch(/ADMIN_ROLE|\brole\s*:|['"]ADMIN['"]/);
      // Clientes só usam o hash de senha; nunca emitem nem leem sessões administrativas.
      expect(code, relative(SRC, f)).not.toMatch(/@\/lib\/auth\/(session|token|verify|config|cookie|revocation)/);
    }
  });
});

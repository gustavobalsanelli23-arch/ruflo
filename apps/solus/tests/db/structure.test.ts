import { afterAll, describe, expect, inject, it } from 'vitest';
import { asAnon, asServiceRole, asSystem, asUser, closePool } from './support/session';

const world = inject('world');

afterAll(closePool);

describe('estrutura de segurança do banco', () => {
  it('RLS está ativa em todas as tabelas do schema public', async () => {
    const tables = await asSystem((s) =>
      s.query<{ name: string; rls: boolean }>(
        `select c.relname as name, c.relrowsecurity as rls
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r', 'p')
         order by 1`,
      ),
    );
    expect(tables.map((t) => t.name)).toEqual([
      'data_imports',
      'organization_invitations',
      'organization_members',
      'organizations',
      'profiles',
    ]);
    expect(tables.filter((t) => !t.rls)).toEqual([]);
  });

  it('anon não tem nenhum privilégio em tabelas ou colunas do schema public', async () => {
    const grants = await asSystem((s) =>
      s.query(
        `select table_name, privilege_type from information_schema.role_table_grants
         where grantee = 'anon' and table_schema = 'public'
         union all
         select table_name, privilege_type from information_schema.column_privileges
         where grantee = 'anon' and table_schema = 'public'`,
      ),
    );
    expect(grants).toEqual([]);
  });

  it('anon não executa nenhuma função dos schemas public e private', async () => {
    const callable = await asSystem((s) =>
      s.query<{ fn: string }>(
        `select n.nspname || '.' || p.proname as fn
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute')`,
      ),
    );
    expect(callable).toEqual([]);
  });

  it('o schema private não é utilizável por anon', async () => {
    const [row] = await asSystem((s) => s.query<{ usage: boolean }>(`select has_schema_privilege('anon', 'private', 'usage') as usage`));
    expect(row!.usage).toBe(false);
  });

  it('toda função SECURITY DEFINER fixa o search_path', async () => {
    const unsafe = await asSystem((s) =>
      s.query<{ fn: string }>(
        `select n.nspname || '.' || p.proname as fn
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where p.prosecdef and n.nspname in ('public', 'private')
           and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
      ),
    );
    expect(unsafe).toEqual([]);
  });

  it('o cliente não consegue ler o hash dos tokens de convite', async () => {
    const [row] = await asSystem((s) =>
      s.query<{ readable: boolean }>(
        `select has_column_privilege('authenticated', 'public.organization_invitations', 'token_hash', 'select') as readable`,
      ),
    );
    expect(row!.readable).toBe(false);
  });

  it('uma requisição anônima recebe permissão negada', async () => {
    await asAnon(async (s) => {
      for (const table of ['organizations', 'profiles', 'organization_members', 'organization_invitations', 'data_imports']) {
        const outcome = await s.attempt(`select * from public.${table}`);
        expect(outcome.ok, table).toBe(false);
        if (!outcome.ok) expect(outcome.error.code).toBe('42501');
      }
      const rpc = await s.attempt(`select public.create_organization('Invasora')`);
      expect(rpc.ok).toBe(false);
    });
  });

  it('o limite de requisições só é acessível pelo servidor (service_role)', async () => {
    await asAnon(async (s) => {
      const outcome = await s.attempt(`select public.check_rate_limit('x', 1, 60)`);
      expect(outcome.ok).toBe(false);
    });
    await asUser(world.users.ownerA, async (s) => {
      const outcome = await s.attempt(`select public.check_rate_limit('x', 1, 60)`);
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error.code).toBe('42501');
    });
    await asServiceRole(async (s) => {
      const results: boolean[] = [];
      for (let i = 0; i < 3; i++) {
        const [row] = await s.query<{ allowed: boolean }>(`select public.check_rate_limit('test:service', 2, 60) as allowed`);
        results.push(row!.allowed);
      }
      expect(results).toEqual([true, true, false]);
    });
  });
});

import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, inject, it } from 'vitest';
import { asSystem, asUser, closePool } from './support/session';

const { users, orgs, memberships, imports } = inject('world');

afterAll(closePool);

const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

describe('membro da organização A acessando dados de A', () => {
  it('vê somente a organização A', async () => {
    const rows = await asUser(users.analystA, (s) => s.query<{ id: string }>('select id from public.organizations'));
    expect(ids(rows)).toEqual([orgs.a]);
  });

  it('vê os cinco membros de A e nenhum de B', async () => {
    const rows = await asUser(users.viewerA, (s) =>
      s.query<{ organization_id: string }>('select organization_id from public.organization_members'),
    );
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r) => r.organization_id))).toEqual(new Set([orgs.a]));
  });

  it('vê as importações de A', async () => {
    const rows = await asUser(users.viewerA, (s) => s.query<{ id: string }>('select id from public.data_imports'));
    expect(ids(rows)).toEqual([imports.a]);
  });

  it('vê o próprio perfil e o dos colegas, nunca o de pessoas de fora', async () => {
    const rows = await asUser(users.viewerA, (s) => s.query<{ id: string }>('select id from public.profiles'));
    expect(ids(rows)).toEqual(ids([users.ownerA, users.adminA, users.analystA, users.viewerA, users.multi].map((id) => ({ id }))));
  });
});

describe('membro de A tentando acessar dados de B', () => {
  it('consultas diretas pelos ids de B voltam vazias', async () => {
    await asUser(users.ownerA, async (s) => {
      expect(await s.query('select * from public.organizations where id = $1', [orgs.b])).toEqual([]);
      expect(await s.query('select * from public.organization_members where organization_id = $1', [orgs.b])).toEqual([]);
      expect(await s.query('select * from public.data_imports where id = $1', [imports.b])).toEqual([]);
      expect(await s.query('select * from public.profiles where id = $1', [users.ownerB])).toEqual([]);
    });
  });

  it('alterar ou excluir pelos ids de B não afeta nenhuma linha (mesmo com commit)', async () => {
    const counts = await asUser(
      users.ownerA,
      async (s) => {
        const results: number[] = [];
        for (const [sql, params] of [
          ['update public.organizations set name = $2 where id = $1', [orgs.b, 'Sequestrada']],
          ['delete from public.organizations where id = $1', [orgs.b]],
          ['update public.organization_members set role = $2 where id = $1', [memberships['analystB@b'], 'viewer']],
          ['delete from public.organization_members where id = $1', [memberships['analystB@b']]],
          ['delete from public.data_imports where id = $1', [imports.b]],
          ['update public.profiles set full_name = $2 where id = $1', [users.ownerB, 'Alterado']],
        ] as const) {
          const outcome = await s.attempt(sql, [...params]);
          expect(outcome.ok, sql).toBe(true);
          results.push(outcome.ok ? outcome.count : -1);
        }
        return results;
      },
      { commit: true },
    );
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);

    const [state] = await asSystem((s) =>
      s.query<{ name: string; members: number; imports: number; owner_name: string }>(
        `select o.name,
                (select count(*)::int from public.organization_members m where m.organization_id = o.id) as members,
                (select count(*)::int from public.data_imports d where d.organization_id = o.id) as imports,
                (select full_name from public.profiles where id = $2) as owner_name
         from public.organizations o where o.id = $1`,
        [orgs.b, users.ownerB],
      ),
    );
    expect(state).toEqual({ name: 'Mercado Boreal', members: 3, imports: 1, owner_name: 'Pessoa ownerB' });
  });

  it('inserir dados com organization_id de B é barrado pelo RLS', async () => {
    await asUser(users.analystA, async (s) => {
      const outcome = await s.attempt(
        `insert into public.data_imports (organization_id, dataset, file_name) values ($1, 'sales', 'b.csv')`,
        [orgs.b],
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.error.code).toBe('42501');
        expect(outcome.error.message).toMatch(/row-level security/);
      }
    });
  });

  it('funções do banco recusam a organização de B mesmo para um admin de A', async () => {
    await asUser(users.adminA, async (s) => {
      const outcome = await s.attempt(`select * from public.create_invitation($1, 'alguem@exemplo.test', 'viewer')`, [orgs.b]);
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error.message).toBe('solus:forbidden');
    });
  });
});

describe('usuário sem associação a nenhuma organização', () => {
  it('não vê organizações, membros, importações nem perfis alheios', async () => {
    await asUser(users.outsider, async (s) => {
      expect(await s.query('select id from public.organizations')).toEqual([]);
      expect(await s.query('select id from public.organization_members')).toEqual([]);
      expect(await s.query('select id from public.data_imports')).toEqual([]);
      expect(ids(await s.query<{ id: string }>('select id from public.profiles'))).toEqual([users.outsider]);
    });
  });

  it('não consegue convidar, renomear ou excluir a organização A', async () => {
    await asUser(users.outsider, async (s) => {
      const invite = await s.attempt(`select * from public.create_invitation($1, 'x@exemplo.test', 'viewer')`, [orgs.a]);
      expect(invite.ok).toBe(false);
      const rename = await s.attempt('update public.organizations set name = $2 where id = $1', [orgs.a, 'Tomada']);
      expect(rename).toMatchObject({ ok: true, count: 0 });
      const remove = await s.attempt('delete from public.organizations where id = $1', [orgs.a]);
      expect(remove).toMatchObject({ ok: true, count: 0 });
    });
  });

  it('um JWT com usuário inexistente não enxerga nada', async () => {
    await asUser(randomUUID(), async (s) => {
      expect(await s.query('select id from public.organizations')).toEqual([]);
      expect(await s.query('select id from public.profiles')).toEqual([]);
    });
  });
});

describe('usuário pertencente a várias organizações', () => {
  it('vê as duas organizações, cada uma com o seu papel', async () => {
    await asUser(users.multi, async (s) => {
      expect(ids(await s.query<{ id: string }>('select id from public.organizations'))).toEqual([orgs.a, orgs.b].sort());
      const roles = await s.query<{ organization_id: string; role: string }>(
        'select organization_id, role from public.organization_members where user_id = $1',
        [users.multi],
      );
      expect(Object.fromEntries(roles.map((r) => [r.organization_id, r.role]))).toEqual({ [orgs.a]: 'viewer', [orgs.b]: 'admin' });
    });
  });

  it('o papel vale por organização: admin em B, apenas leitor em A', async () => {
    await asUser(users.multi, async (s) => {
      const renameB = await s.attempt('update public.organizations set name = $2 where id = $1', [orgs.b, 'Mercado Boreal Centro']);
      expect(renameB).toMatchObject({ ok: true, count: 1 });
      const renameA = await s.attempt('update public.organizations set name = $2 where id = $1', [orgs.a, 'Aurora Tomada']);
      expect(renameA).toMatchObject({ ok: true, count: 0 });

      const inviteB = await s.attempt(`select * from public.create_invitation($1, 'novo.b@exemplo.test', 'viewer')`, [orgs.b]);
      expect(inviteB.ok).toBe(true);
      const inviteA = await s.attempt(`select * from public.create_invitation($1, 'novo.a@exemplo.test', 'viewer')`, [orgs.a]);
      expect(inviteA.ok).toBe(false);

      const importA = await s.attempt(
        `insert into public.data_imports (organization_id, dataset, file_name) values ($1, 'sales', 'a.csv')`,
        [orgs.a],
      );
      expect(importA.ok).toBe(false);
    });
  });
});

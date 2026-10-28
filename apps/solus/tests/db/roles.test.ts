import { afterAll, describe, expect, inject, it } from 'vitest';
import { asSystem, asUser, closePool, type Outcome, type Session } from './support/session';
import type { Person } from './support/world';

const { users, orgs, memberships, imports } = inject('world');

afterAll(closePool);

type Expectation = 'allowed' | 'no-rows' | 'denied';

function verdict(outcome: Outcome<unknown>): Expectation {
  if (!outcome.ok) return 'denied';
  return outcome.count > 0 ? 'allowed' : 'no-rows';
}

/** Runs one statement as `person` (rolled back) and classifies the result. */
async function tryAs(person: Person, sql: string, params: unknown[] = []) {
  return asUser(users[person], async (s) => {
    const outcome = await s.attempt(sql, params);
    return { verdict: verdict(outcome), error: outcome.ok ? null : outcome.error };
  });
}

describe('organização: renomear, excluir e campos protegidos', () => {
  it.each([
    ['ownerA', 'allowed'],
    ['adminA', 'allowed'],
    ['analystA', 'no-rows'],
    ['viewerA', 'no-rows'],
  ] as const)('%s renomeando a organização: %s', async (person, expected) => {
    const { verdict: result } = await tryAs(person, 'update public.organizations set name = $2 where id = $1', [orgs.a, 'Aurora Renomeada']);
    expect(result).toBe(expected);
  });

  it.each([
    ['ownerA', 'allowed'],
    ['adminA', 'no-rows'],
    ['analystA', 'no-rows'],
    ['viewerA', 'no-rows'],
  ] as const)('%s excluindo a organização: %s', async (person, expected) => {
    const { verdict: result } = await tryAs(person, 'delete from public.organizations where id = $1', [orgs.a]);
    expect(result).toBe(expected);
  });

  it.each(['ownerA', 'adminA'] as const)('%s não altera slug nem criador (privilégio por coluna)', async (person) => {
    for (const sql of [
      'update public.organizations set slug = $2 where id = $1',
      'update public.organizations set created_by = null where id = $1 and $2::text is not null',
      'update public.organizations set id = gen_random_uuid() where id = $1 and $2::text is not null',
    ]) {
      const { verdict: result, error } = await tryAs(person, sql, [orgs.a, 'novo-slug']);
      expect(result, sql).toBe('denied');
      expect(error?.code).toBe('42501');
    }
  });

  it('ninguém insere organizações diretamente (só pela função create_organization)', async () => {
    const { verdict: result, error } = await tryAs('ownerA', `insert into public.organizations (name, slug) values ('Direta', 'direta')`);
    expect(result).toBe('denied');
    expect(error?.code).toBe('42501');
  });
});

describe('importações (data_imports)', () => {
  const create = `select * from public.create_import($1, 'products', 'produtos.csv', 'csv', 2048, repeat('a', 64))`;

  it.each([
    ['ownerA', 'allowed'],
    ['adminA', 'allowed'],
    ['analystA', 'allowed'],
    ['viewerA', 'denied'],
  ] as const)('%s registrando uma importação: %s', async (person, expected) => {
    const { verdict: result, error } = await tryAs(person, create, [orgs.a]);
    expect(result).toBe(expected);
    if (expected === 'denied') expect(error?.message).toBe('solus:forbidden');
  });

  it('o registro nasce pendente, em nome de quem enviou, com o caminho do Storage dentro da organização', async () => {
    await asUser(users.analystA, async (s) => {
      const [created] = await s.query<{ import_id: string; object_path: string }>(create, [orgs.a]);
      expect(created!.object_path).toBe(`${orgs.a}/${created!.import_id}/original.csv`);
      const [row] = await s.query<{ status: string; created_by: string }>(
        'select status, created_by from public.data_imports where id = $1',
        [created!.import_id],
      );
      expect(row).toEqual({ status: 'pending', created_by: users.analystA });
    });
  });

  it.each(['ownerA', 'adminA', 'analystA', 'viewerA'] as const)('%s não insere importações diretamente na tabela', async (person) => {
    const { verdict: result, error } = await tryAs(
      person,
      `insert into public.data_imports (organization_id, dataset, file_name, status) values ($1, 'sales', 'x.csv', 'completed')`,
      [orgs.a],
    );
    expect(result).toBe('denied');
    expect(error?.code).toBe('42501');
  });

  it.each(['ownerA', 'adminA', 'analystA', 'viewerA'] as const)('%s não altera status de importação pelo cliente', async (person) => {
    const { verdict: result } = await tryAs(person, `update public.data_imports set status = 'failed' where id = $1`, [imports.a]);
    expect(result).toBe('denied');
  });

  it.each([
    ['ownerA', 'allowed'],
    ['adminA', 'allowed'],
    ['analystA', 'no-rows'],
    ['viewerA', 'no-rows'],
  ] as const)('%s excluindo do histórico uma importação cancelada: %s', async (person, expected) => {
    const { verdict: result } = await tryAs(person, 'delete from public.data_imports where id = $1', [imports.a]);
    expect(result).toBe(expected);
  });

  it('uma importação concluída não sai do histórico por DELETE: antes precisa ser desfeita', async () => {
    const [completed] = await asSystem(
      (s) =>
        s.query<{ id: string }>(
          `insert into public.data_imports (organization_id, dataset, file_name, status) values ($1, 'sales', 'feita.csv', 'completed') returning id`,
          [orgs.a],
        ),
      { commit: true },
    );
    try {
      const { verdict: result } = await tryAs('ownerA', 'delete from public.data_imports where id = $1', [completed!.id]);
      expect(result).toBe('no-rows');
    } finally {
      await asSystem((s) => s.query('delete from public.data_imports where id = $1', [completed!.id]), { commit: true });
    }
  });
});

describe('alteração de papéis', () => {
  const setRole = 'update public.organization_members set role = $2 where id = $1';

  it('admin ajusta analistas e leitores entre esses dois papéis', async () => {
    expect((await tryAs('adminA', setRole, [memberships['analystA@a'], 'viewer'])).verdict).toBe('allowed');
    expect((await tryAs('adminA', setRole, [memberships['viewerA@a'], 'analyst'])).verdict).toBe('allowed');
  });

  it.each([
    ['promover analista a admin', 'analystA@a', 'admin'],
    ['promover leitor a owner', 'viewerA@a', 'owner'],
    ['rebaixar o owner', 'ownerA@a', 'viewer'],
    ['alterar o próprio papel', 'adminA@a', 'analyst'],
  ])('admin não pode %s', async (_label, membership, role) => {
    const { verdict: result, error } = await tryAs('adminA', setRole, [memberships[membership], role]);
    expect(result).toBe('denied');
    expect(error?.message).toBe('solus:role_requires_owner');
  });

  it.each(['analystA', 'viewerA'] as const)('%s não altera papel de ninguém', async (person) => {
    const { verdict: result } = await tryAs(person, setRole, [memberships['viewerA@a'], 'analyst']);
    expect(result).toBe('no-rows');
  });

  it('owner promove membros a admin e a owner', async () => {
    expect((await tryAs('ownerA', setRole, [memberships['analystA@a'], 'admin'])).verdict).toBe('allowed');
    expect((await tryAs('ownerA', setRole, [memberships['adminA@a'], 'owner'])).verdict).toBe('allowed');
  });

  it('o último owner não pode deixar de ser owner', async () => {
    const { verdict: result, error } = await tryAs('ownerA', setRole, [memberships['ownerA@a'], 'admin']);
    expect(result).toBe('denied');
    expect(error?.message).toBe('solus:last_owner');
  });

  it('com outro owner na organização, o owner pode passar a ser admin', async () => {
    await asUser(users.ownerA, async (s) => {
      await s.query(setRole, [memberships['adminA@a'], 'owner']);
      const outcome = await s.attempt(setRole, [memberships['ownerA@a'], 'admin']);
      expect(outcome).toMatchObject({ ok: true, count: 1 });
    });
  });

  it('organização e usuário do vínculo são imutáveis (privilégio por coluna)', async () => {
    for (const sql of [
      'update public.organization_members set organization_id = $2 where id = $1',
      'update public.organization_members set user_id = $2 where id = $1',
    ]) {
      const target = sql.includes('organization_id') ? orgs.b : users.outsider;
      const { verdict: result, error } = await tryAs('ownerA', sql, [memberships['viewerA@a'], target]);
      expect(result, sql).toBe('denied');
      expect(error?.code).toBe('42501');
    }
  });

  it('ninguém se adiciona a uma organização por INSERT direto', async () => {
    const { verdict: result } = await tryAs(
      'outsider',
      `insert into public.organization_members (organization_id, user_id, role) values ($1, $2, 'owner')`,
      [orgs.a, users.outsider],
    );
    expect(result).toBe('denied');
  });
});

describe('remoção de membros e saída da organização', () => {
  const remove = 'delete from public.organization_members where id = $1';

  it('admin remove analistas e leitores', async () => {
    expect((await tryAs('adminA', remove, [memberships['viewerA@a']])).verdict).toBe('allowed');
    expect((await tryAs('adminA', remove, [memberships['analystA@a']])).verdict).toBe('allowed');
  });

  it('admin não remove o owner', async () => {
    const { verdict: result, error } = await tryAs('adminA', remove, [memberships['ownerA@a']]);
    expect(result).toBe('denied');
    expect(error?.message).toBe('solus:role_requires_owner');
  });

  it.each(['analystA', 'viewerA'] as const)('%s não remove outras pessoas', async (person) => {
    const target = person === 'viewerA' ? memberships['analystA@a'] : memberships['viewerA@a'];
    expect((await tryAs(person, remove, [target])).verdict).toBe('no-rows');
  });

  it.each(['viewerA', 'analystA', 'adminA'] as const)('%s pode sair da organização', async (person) => {
    expect((await tryAs(person, remove, [memberships[`${person}@a`]])).verdict).toBe('allowed');
  });

  it('owner remove um admin', async () => {
    expect((await tryAs('ownerA', remove, [memberships['adminA@a']])).verdict).toBe('allowed');
  });

  it('o último owner não pode sair', async () => {
    const { verdict: result, error } = await tryAs('ownerA', remove, [memberships['ownerA@a']]);
    expect(result).toBe('denied');
    expect(error?.message).toBe('solus:last_owner');
  });
});

describe('perfis', () => {
  it('cada pessoa edita o próprio nome', async () => {
    const { verdict: result } = await tryAs('viewerA', 'update public.profiles set full_name = $2 where id = $1', [users.viewerA, 'Novo Nome']);
    expect(result).toBe('allowed');
  });

  it('ninguém edita o perfil de um colega, nem sendo owner', async () => {
    const { verdict: result } = await tryAs('ownerA', 'update public.profiles set full_name = $2 where id = $1', [users.viewerA, 'Trocado']);
    expect(result).toBe('no-rows');
  });

  it('e-mail e id do perfil não são editáveis pelo cliente', async () => {
    for (const sql of [
      `update public.profiles set email = 'outro@exemplo.test' where id = $1`,
      'update public.profiles set id = gen_random_uuid() where id = $1',
    ]) {
      const { verdict: result, error } = await tryAs('viewerA', sql, [users.viewerA]);
      expect(result, sql).toBe('denied');
      expect(error?.code).toBe('42501');
    }
  });
});

describe('convites pendentes', () => {
  async function withInvitation<T>(fn: (s: Session) => Promise<T>) {
    return asUser(users.ownerA, async (s) => {
      await s.query(`select * from public.create_invitation($1, 'pendente.lista@exemplo.test', 'viewer')`, [orgs.a]);
      return fn(s);
    });
  }

  it('são visíveis para owner e admin, não para analistas e leitores', async () => {
    await withInvitation(async (s) => {
      expect(await s.query('select email from public.organization_invitations')).toEqual([{ email: 'pendente.lista@exemplo.test' }]);
      for (const person of ['analystA', 'viewerA'] as const) {
        await s.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: users[person], role: 'authenticated' })]);
        expect(await s.query('select email from public.organization_invitations'), person).toEqual([]);
      }
      await s.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: users.adminA, role: 'authenticated' })]);
      expect(await s.query('select email from public.organization_invitations')).toHaveLength(1);
    });
  });

  it('só owner e admin revogam convites', async () => {
    await withInvitation(async (s) => {
      await s.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: users.analystA, role: 'authenticated' })]);
      expect(await s.attempt('delete from public.organization_invitations')).toMatchObject({ ok: true, count: 0 });
      await s.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: users.adminA, role: 'authenticated' })]);
      expect(await s.attempt('delete from public.organization_invitations')).toMatchObject({ ok: true, count: 1 });
    });
  });

  it('o cliente não cria nem altera convites diretamente', async () => {
    await withInvitation(async (s) => {
      const insert = await s.attempt(
        `insert into public.organization_invitations (organization_id, email, role, token_hash) values ($1, 'x@exemplo.test', 'admin', '\\x00')`,
        [orgs.a],
      );
      expect(insert.ok).toBe(false);
      const update = await s.attempt(`update public.organization_invitations set role = 'admin'`);
      expect(update.ok).toBe(false);
    });
  });
});

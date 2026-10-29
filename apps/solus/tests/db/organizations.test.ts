import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { asAnon, asSystem, asUser, closePool } from './support/session';

const { users, orgs, imports } = inject('world');

const founder = { id: '', email: 'fundadora@exemplo.test' };

beforeAll(async () => {
  const [row] = await asSystem(
    (s) =>
      s.query<{ id: string }>(
        `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
         values (gen_random_uuid(), $1, now(), '{"full_name": "Fundadora"}') returning id`,
        [founder.email],
      ),
    { commit: true },
  );
  founder.id = row!.id;
});

afterAll(closePool);

describe('criação de organização', () => {
  it('cria a organização e torna quem criou owner, na mesma transação', async () => {
    await asUser(founder.id, async (s) => {
      const [created] = await s.query<{ id: string }>(`select public.create_organization('  Padaria   São João ') as id`);
      const [org] = await s.query<{ name: string; slug: string; created_by: string }>(
        'select name, slug, created_by from public.organizations where id = $1',
        [created!.id],
      );
      expect(org).toEqual({ name: 'Padaria São João', slug: 'padaria-sao-joao', created_by: founder.id });
      const members = await s.query<{ user_id: string; role: string }>(
        'select user_id, role from public.organization_members where organization_id = $1',
        [created!.id],
      );
      expect(members).toEqual([{ user_id: founder.id, role: 'owner' }]);
    });
  });

  it('gera um identificador único quando o nome já existe', async () => {
    await asUser(founder.id, async (s) => {
      const [created] = await s.query<{ id: string }>(`select public.create_organization('Empório Aurora') as id`);
      const [org] = await s.query<{ slug: string }>('select slug from public.organizations where id = $1', [created!.id]);
      expect(org!.slug).toMatch(/^emporio-aurora-[0-9a-f]{6}$/);
    });
  });

  it.each([
    ['curto demais', 'A'],
    ['longo demais', 'x'.repeat(81)],
    ['só espaços', '     '],
  ])('recusa nome %s', async (_label, name) => {
    await asUser(founder.id, async (s) => {
      const outcome = await s.attempt('select public.create_organization($1)', [name]);
      expect(outcome.ok ? null : outcome.error.message).toBe('solus:invalid_name');
    });
  });

  it('limita a 5 organizações criadas por hora por pessoa', async () => {
    await asUser(founder.id, async (s) => {
      for (let i = 0; i < 5; i++) await s.query('select public.create_organization($1)', [`Loja ${i + 1}`]);
      const outcome = await s.attempt('select public.create_organization($1)', ['Loja 6']);
      expect(outcome.ok ? null : outcome.error.message).toBe('solus:rate_limited');
    });
  });

  it('requisições sem usuário não criam organizações', async () => {
    await asAnon(async (s) => {
      const outcome = await s.attempt(`select public.create_organization('Anônima')`);
      expect(outcome.ok).toBe(false);
    });
  });
});

describe('perfis criados pelo Auth', () => {
  it('o cadastro gera o perfil com nome aparado e e-mail em minúsculas', async () => {
    await asSystem(async (s) => {
      const [user] = await s.query<{ id: string }>(
        `insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'Nova.Pessoa@Exemplo.test', $1) returning id`,
        [{ full_name: `  ${'N'.repeat(130)}  ` }],
      );
      const [profile] = await s.query<{ email: string; full_name: string }>('select email, full_name from public.profiles where id = $1', [user!.id]);
      expect(profile!.email).toBe('nova.pessoa@exemplo.test');
      expect(profile!.full_name).toHaveLength(120);

      await s.query(`update auth.users set email = 'trocado@exemplo.test' where id = $1`, [user!.id]);
      const [synced] = await s.query<{ email: string }>('select email from public.profiles where id = $1', [user!.id]);
      expect(synced!.email).toBe('trocado@exemplo.test');
    });
  });
});

describe('exclusão em cascata', () => {
  it('excluir a organização remove membros, convites e importações dela, sem tocar a outra', async () => {
    await asUser(users.ownerA, async (s) => {
      await s.query(`select * from public.create_invitation($1, 'cascata@exemplo.test', 'viewer')`, [orgs.a]);
      const removed = await s.attempt('delete from public.organizations where id = $1', [orgs.a]);
      expect(removed).toMatchObject({ ok: true, count: 1 });

      await s.query('reset role');
      const [left] = await s.query<{ members: number; invitations: number; imports: number; other: number }>(
        `select
           (select count(*)::int from public.organization_members where organization_id = $1) as members,
           (select count(*)::int from public.organization_invitations where organization_id = $1) as invitations,
           (select count(*)::int from public.data_imports where organization_id = $1) as imports,
           (select count(*)::int from public.data_imports where id = $2) as other`,
        [orgs.a, imports.b],
      );
      expect(left).toEqual({ members: 0, invitations: 0, imports: 0, other: 1 });
    });
  });

  it('excluir a conta remove o perfil e os vínculos dela', async () => {
    await asSystem(async (s) => {
      await s.query('delete from auth.users where id = $1', [users.analystB]);
      const [left] = await s.query<{ profiles: number; members: number }>(
        `select (select count(*)::int from public.profiles where id = $1) as profiles,
                (select count(*)::int from public.organization_members where user_id = $1) as members`,
        [users.analystB],
      );
      expect(left).toEqual({ profiles: 0, members: 0 });
    });
  });
});

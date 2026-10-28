import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { asSystem, asUser, closePool } from './support/session';

const { users, orgs } = inject('world');

const invited = { id: '', email: 'convidada@exemplo.test' };
const other = { id: '', email: 'outra.pessoa@exemplo.test' };
const unconfirmed = { id: '', email: 'sem.confirmacao@exemplo.test' };

beforeAll(async () => {
  await asSystem(
    async (s) => {
      for (const person of [invited, other, unconfirmed]) {
        const [row] = await s.query<{ id: string }>(
          `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
           values (gen_random_uuid(), $1, $2, '{}') returning id`,
          [person.email, person === unconfirmed ? null : new Date()],
        );
        person.id = row!.id;
      }
    },
    { commit: true },
  );
});

afterAll(closePool);

type Invitation = { invitation_id: string; invitation_token: string; invitation_expires_at: Date };

const createInvitation = `select * from public.create_invitation($1, $2, $3)`;

describe('criação de convites', () => {
  it('owner convida: o token aparece uma vez e o banco guarda só o hash SHA-256', async () => {
    await asUser(users.ownerA, async (s) => {
      const [invite] = await s.query<Invitation>(createInvitation, [orgs.a, ' Convidada@Exemplo.test ', 'analyst']);
      expect(invite!.invitation_token).toMatch(/^[0-9a-f]{64}$/);

      await s.query(`select set_config('role', 'postgres', true)`);
      const [stored] = await s.query<{ email: string; hash: string; role: string; days: number }>(
        `select email, encode(token_hash, 'hex') as hash, role,
                round(extract(epoch from expires_at - created_at) / 86400)::int as days
         from public.organization_invitations where id = $1`,
        [invite!.invitation_id],
      );
      expect(stored).toEqual({
        email: 'convidada@exemplo.test',
        hash: createHash('sha256').update(invite!.invitation_token).digest('hex'),
        role: 'analyst',
        days: 7,
      });
      expect(stored!.hash).not.toBe(invite!.invitation_token);
    });
  });

  it.each([
    ['admin convidando analista', 'adminA', 'analyst', null],
    ['admin convidando leitor', 'adminA', 'viewer', null],
    ['admin convidando admin', 'adminA', 'admin', 'solus:role_requires_owner'],
    ['owner convidando admin', 'ownerA', 'admin', null],
    ['owner convidando owner', 'ownerA', 'owner', 'solus:invalid_role'],
    ['analista convidando', 'analystA', 'viewer', 'solus:forbidden'],
    ['leitor convidando', 'viewerA', 'viewer', 'solus:forbidden'],
  ] as const)('%s', async (_label, person, role, error) => {
    await asUser(users[person], async (s) => {
      const outcome = await s.attempt(createInvitation, [orgs.a, 'nova.pessoa@exemplo.test', role]);
      if (error) {
        expect(outcome.ok).toBe(false);
        if (!outcome.ok) expect(outcome.error.message).toBe(error);
      } else {
        expect(outcome.ok).toBe(true);
      }
    });
  });

  it('recusa e-mail inválido e quem já é membro', async () => {
    await asUser(users.ownerA, async (s) => {
      const invalid = await s.attempt(createInvitation, [orgs.a, 'sem-arroba', 'viewer']);
      expect(invalid.ok ? null : invalid.error.message).toBe('solus:invalid_email');
      const member = await s.attempt(createInvitation, [orgs.a, 'VIEWERA@exemplo.test', 'viewer']);
      expect(member.ok ? null : member.error.message).toBe('solus:already_member');
    });
  });

  it('convidar de novo o mesmo e-mail invalida o link anterior', async () => {
    await asUser(users.ownerA, async (s) => {
      const [first] = await s.query<Invitation>(createInvitation, [orgs.a, invited.email, 'viewer']);
      const [second] = await s.query<Invitation>(createInvitation, [orgs.a, invited.email, 'analyst']);
      expect(second!.invitation_token).not.toBe(first!.invitation_token);
      const [{ pending }] = (await s.query<{ pending: number }>(
        `select count(*)::int as pending from public.organization_invitations where email = $1 and accepted_at is null`,
        [invited.email],
      )) as [{ pending: number }];
      expect(pending).toBe(1);

      await s.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: invited.id, role: 'authenticated' })]);
      expect(await s.query('select * from public.get_invitation($1)', [first!.invitation_token])).toEqual([]);
      expect(await s.query('select * from public.get_invitation($1)', [second!.invitation_token])).toHaveLength(1);
    });
  });

  it('limita a 30 convites por hora por pessoa', async () => {
    await asUser(users.ownerB, async (s) => {
      for (let i = 0; i < 30; i++) {
        await s.query(createInvitation, [orgs.b, `lote${i}@exemplo.test`, 'viewer']);
      }
      const outcome = await s.attempt(createInvitation, [orgs.b, 'lote-extra@exemplo.test', 'viewer']);
      expect(outcome.ok ? null : outcome.error.message).toBe('solus:rate_limited');
    });
  });
});

describe('aceite de convites', () => {
  /** Creates (and commits) an invitation from ownerB, returning the token. */
  async function invite(email: string, role = 'analyst') {
    const [row] = await asUser(users.ownerB, (s) => s.query<Invitation>(createInvitation, [orgs.b, email, role]), { commit: true });
    return row!.invitation_token;
  }

  it('a prévia mostra organização, papel e e-mail mascarado, sem revelar o e-mail completo', async () => {
    const token = await invite(invited.email);
    const [preview] = await asUser(invited.id, (s) => s.query('select * from public.get_invitation($1)', [token]));
    expect(preview).toMatchObject({
      organization_name: 'Mercado Boreal',
      invited_role: 'analyst',
      email_hint: 'c•••@exemplo.test',
      email_matches: true,
      invitation_status: 'pending',
    });
    const [forOther] = await asUser(other.id, (s) => s.query('select * from public.get_invitation($1)', [token]));
    expect(forOther).toMatchObject({ email_matches: false });
    expect(await asUser(invited.id, (s) => s.query('select * from public.get_invitation($1)', ['token-invalido']))).toEqual([]);
  });

  it('a pessoa convidada entra com o papel do convite, e o link não pode ser reutilizado', async () => {
    const token = await invite(invited.email, 'analyst');
    await asUser(invited.id, async (s) => {
      const [joined] = await s.query<{ org: string }>('select public.accept_invitation($1) as org', [token]);
      expect(joined!.org).toBe(orgs.b);
      const [membership] = await s.query<{ role: string }>(
        'select role from public.organization_members where organization_id = $1 and user_id = $2',
        [orgs.b, invited.id],
      );
      expect(membership!.role).toBe('analyst');
      expect(await s.query<{ id: string }>('select id from public.organizations')).toEqual([{ id: orgs.b }]);

      const again = await s.attempt('select public.accept_invitation($1)', [token]);
      expect(again.ok ? null : again.error.message).toBe('solus:invitation_used');
    });
  });

  it('outra conta não consegue usar o link, mesmo tendo o token', async () => {
    const token = await invite(invited.email);
    await asUser(other.id, async (s) => {
      const outcome = await s.attempt('select public.accept_invitation($1)', [token]);
      expect(outcome.ok ? null : outcome.error.message).toBe('solus:invitation_email_mismatch');
      expect(await s.query('select id from public.organizations')).toEqual([]);
    });
  });

  it('exige e-mail confirmado', async () => {
    const token = await invite(unconfirmed.email);
    await asUser(unconfirmed.id, async (s) => {
      const outcome = await s.attempt('select public.accept_invitation($1)', [token]);
      expect(outcome.ok ? null : outcome.error.message).toBe('solus:email_not_confirmed');
    });
  });

  it('recusa convite expirado', async () => {
    const token = randomBytes(32).toString('hex');
    await asSystem(
      (s) =>
        s.query(
          `insert into public.organization_invitations (organization_id, email, role, token_hash, invited_by, expires_at)
           values ($1, $2, 'viewer', decode($3, 'hex'), $4, now() - interval '1 minute')`,
          [orgs.b, 'expirado@exemplo.test', createHash('sha256').update(token).digest('hex'), users.ownerB],
        ),
      { commit: true },
    );
    await asUser(invited.id, async (s) => {
      const [preview] = await s.query<{ invitation_status: string }>('select * from public.get_invitation($1)', [token]);
      expect(preview!.invitation_status).toBe('expired');
    });
    const [expiredUser] = await asSystem(
      (s) =>
        s.query<{ id: string }>(
          `insert into auth.users (id, email, email_confirmed_at) values (gen_random_uuid(), 'expirado@exemplo.test', now()) returning id`,
        ),
      { commit: true },
    );
    await asUser(expiredUser!.id, async (s) => {
      const outcome = await s.attempt('select public.accept_invitation($1)', [token]);
      expect(outcome.ok ? null : outcome.error.message).toBe('solus:invitation_expired');
    });
  });

  it('token inexistente ou malformado é recusado', async () => {
    await asUser(invited.id, async (s) => {
      for (const token of ['', 'abc', 'f'.repeat(64)]) {
        const outcome = await s.attempt('select public.accept_invitation($1)', [token]);
        expect(outcome.ok ? null : outcome.error.message).toBe('solus:invitation_not_found');
      }
    });
  });
});

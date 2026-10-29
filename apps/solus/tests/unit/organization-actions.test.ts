import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Organization Server Actions with Supabase replaced by a recorder. They must
 * act on the active organization resolved on the server and never on an id
 * sent by the browser. (The database enforces the same rule; see tests/db.)
 */

const ACTIVE = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const MEMBER = '33333333-3333-4333-8333-333333333333';

type Result = { data: unknown; error: unknown };
const calls: { table: string; chain: unknown[][] }[] = [];
const rpc = vi.fn();
let nextResult: Result = { data: [{ id: MEMBER }], error: null };

function from(table: string) {
  const entry = { table, chain: [] as unknown[][] };
  calls.push(entry);
  const builder: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_target, prop) =>
        prop === 'then'
          ? (resolve: (value: Result) => void) => resolve(nextResult)
          : (...args: unknown[]) => {
              entry.chain.push([prop, ...args]);
              return builder;
            },
    },
  );
  return builder;
}

const supabase = { from, rpc };
const state = vi.hoisted(() => ({ role: 'admin' as string, authorized: true }));
const cookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn() };

vi.mock('@/services/workspace', () => ({
  ACTIVE_ORG_COOKIE: 'solus-org',
  PENDING_INVITE_COOKIE: 'solus-convite',
  authorize: async () =>
    state.authorized
      ? {
          ok: true,
          supabase,
          workspace: {
            user: { id: 'u1', email: 'ana@empresa.com.br' },
            memberships: [],
            active: { organizationId: ACTIVE, memberId: 'm-self', name: 'Empório Aurora', slug: 'emporio-aurora', role: state.role },
          },
        }
      : { ok: false, error: { code: 'forbidden', message: 'Seu papel nesta organização não permite esta ação.' } },
  loadWorkspace: async () => ({
    user: { id: 'u1', email: 'ana@empresa.com.br' },
    memberships: [{ organizationId: ACTIVE, name: 'Empório Aurora', role: 'admin' }],
    active: null,
  }),
}));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: async () => supabase }));
vi.mock('@/services/session', () => ({ getSessionUser: async () => ({ id: 'u1', email: 'ana@empresa.com.br' }) }));
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error('redirect'), { url });
  },
}));

const {
  changeMemberRoleAction,
  deleteOrganizationAction,
  inviteMemberAction,
  removeMemberAction,
  switchOrganizationAction,
} = await import('@/modules/organizations/actions');

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
  vi.stubEnv('SITE_URL', 'https://app.solus.example');
  state.role = 'admin';
  state.authorized = true;
  nextResult = { data: [{ id: MEMBER }], error: null };
});

describe('convites', () => {
  it('usam a organização ativa do servidor, ignorando organization_id enviado pelo navegador', async () => {
    rpc.mockResolvedValue({
      data: [{ invitation_id: 'i1', invitation_token: 'a'.repeat(64), invitation_expires_at: '2026-11-04T12:00:00Z' }],
      error: null,
    });
    const result = await inviteMemberAction(
      { status: 'idle' },
      form({ email: ' Bia@Empresa.com.br ', role: 'analyst', organization_id: OTHER, p_organization_id: OTHER }),
    );
    expect(rpc).toHaveBeenCalledWith('create_invitation', { p_organization_id: ACTIVE, p_email: 'bia@empresa.com.br', p_role: 'analyst' });
    expect(result.payload?.link).toBe(`https://app.solus.example/convite/${'a'.repeat(64)}`);
  });

  it('quem não tem papel suficiente é barrado antes do banco', async () => {
    state.authorized = false;
    const result = await inviteMemberAction({ status: 'idle' }, form({ email: 'bia@empresa.com.br', role: 'viewer' }));
    expect(result).toMatchObject({ status: 'error', code: 'forbidden' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('erros do banco viram mensagens no campo certo', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'solus:already_member' } });
    const result = await inviteMemberAction({ status: 'idle' }, form({ email: 'bia@empresa.com.br', role: 'viewer' }));
    expect(result.fieldErrors?.email).toBe('Esta pessoa já faz parte da organização.');
  });
});

describe('membros', () => {
  it('alterar papel atualiza só a coluna role e só dentro da organização ativa', async () => {
    await changeMemberRoleAction(MEMBER, 'viewer');
    expect(calls).toEqual([
      {
        table: 'organization_members',
        chain: [['update', { role: 'viewer' }], ['eq', 'id', MEMBER], ['eq', 'organization_id', ACTIVE], ['select', 'id']],
      },
    ]);
  });

  it('ids que não são UUID não chegam ao banco', async () => {
    const result = await changeMemberRoleAction("1' or '1'='1", 'owner');
    expect(result.status).toBe('error');
    expect(calls).toEqual([]);
  });

  it('remover um id de outra organização não remove nada e avisa', async () => {
    nextResult = { data: [], error: null };
    const result = await removeMemberAction(MEMBER);
    expect(result).toMatchObject({ status: 'error', code: 'not_found' });
    expect(calls[0]!.chain).toContainEqual(['eq', 'organization_id', ACTIVE]);
  });
});

describe('organização ativa', () => {
  it('só troca para organizações das quais a pessoa é membro', async () => {
    const denied = await switchOrganizationAction(OTHER);
    expect(denied).toMatchObject({ status: 'error', code: 'forbidden' });
    expect(cookieStore.set).not.toHaveBeenCalled();

    const allowed = await switchOrganizationAction(ACTIVE);
    expect(allowed.status).toBe('success');
    expect(cookieStore.set).toHaveBeenCalledWith('solus-org', ACTIVE, expect.objectContaining({ httpOnly: true, sameSite: 'lax' }));
  });

  it('excluir exige digitar o nome exato e é recusado para não proprietários', async () => {
    state.role = 'owner';
    const typo = await deleteOrganizationAction({ status: 'idle' }, form({ confirmation: 'Emporio Aurora' }));
    expect(typo.fieldErrors?.confirmation).toBeDefined();
    expect(calls).toEqual([]);

    state.authorized = false;
    const forbidden = await deleteOrganizationAction({ status: 'idle' }, form({ confirmation: 'Empório Aurora' }));
    expect(forbidden.status).toBe('error');
    expect(calls).toEqual([]);
  });
});

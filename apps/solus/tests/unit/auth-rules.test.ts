import { afterEach, describe, expect, it, vi } from 'vitest';
import { assignableRoles, can, canRemoveMember, invitableRoles, PERMISSION_MATRIX } from '@/lib/auth/permissions';
import { loginPath, safeNextPath } from '@/lib/auth/redirect';
import { getSiteUrl, getSupabaseConfig } from '@/lib/env';
import { mapAuthError, mapDatabaseError } from '@/lib/supabase/errors';
import { changePasswordSchema, emailOnlySchema, signInSchema, signUpSchema } from '@/schemas/auth';
import { changeRoleSchema, createOrganizationSchema, inviteMemberSchema, invitationTokenSchema } from '@/schemas/organization';

describe('safeNextPath (proteção contra open redirect)', () => {
  it.each([
    ['https://evil.example', '/visao-geral'],
    ['//evil.example', '/visao-geral'],
    ['/\\evil.example', '/visao-geral'],
    ['javascript:alert(1)', '/visao-geral'],
    ['/configuracoes\u0000', '/visao-geral'],
    ['/%0d%0aSet-Cookie:x', '/%0d%0aSet-Cookie:x'],
    ['/entrar', '/visao-geral'],
    ['/auth/confirm?x=1', '/visao-geral'],
    ['/configuracoes?secao=membros', '/configuracoes?secao=membros'],
    ['/convite/abc#topo', '/convite/abc#topo'],
  ])('%s → %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it('ignora valores que não são texto', () => {
    expect(safeNextPath(null)).toBe('/visao-geral');
    expect(safeNextPath(['/a'])).toBe('/visao-geral');
  });

  it('monta o caminho de login com destino e motivo', () => {
    expect(loginPath({ next: '/dados', reason: 'sessao-expirada' })).toBe('/entrar?next=%2Fdados&motivo=sessao-expirada');
    expect(loginPath({ next: '//evil' })).toBe('/entrar');
    expect(loginPath({ next: '/visao-geral' })).toBe('/entrar');
  });
});

describe('validação de entrada (Zod)', () => {
  it('normaliza o e-mail e recusa formatos inválidos', () => {
    expect(emailOnlySchema.parse({ email: '  Ana@Empresa.COM.br ' }).email).toBe('ana@empresa.com.br');
    expect(emailOnlySchema.safeParse({ email: 'ana@' }).success).toBe(false);
    expect(emailOnlySchema.safeParse({ email: `${'a'.repeat(250)}@x.com` }).success).toBe(false);
  });

  it('exige senha com 8+ caracteres, letras e números, e no máximo 72', () => {
    const base = { fullName: 'Ana Souza', email: 'ana@empresa.com.br' };
    expect(signUpSchema.safeParse({ ...base, password: 'abcdefgh' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: '12345678' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: 'abc123' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: `a1${'x'.repeat(71)}` }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: 'mercado2026' }).success).toBe(true);
  });

  it('descarta campos que a ação não espera (mass assignment)', () => {
    const parsed = signInSchema.parse({ email: 'a@b.co', password: 'x', role: 'owner', organization_id: 'outra' } as never);
    expect(parsed).toEqual({ email: 'a@b.co', password: 'x' });
  });

  it('confere a repetição da nova senha', () => {
    const result = changePasswordSchema.safeParse({ currentPassword: 'x', password: 'nova12345', confirmation: 'nova12346' });
    expect(result.success).toBe(false);
  });

  it('apara e compacta o nome da organização', () => {
    expect(createOrganizationSchema.parse({ name: '  Padaria   São João  ' }).name).toBe('Padaria São João');
    expect(createOrganizationSchema.safeParse({ name: 'A' }).success).toBe(false);
  });

  it('não permite convidar alguém como owner', () => {
    expect(inviteMemberSchema.safeParse({ email: 'a@b.co', role: 'owner' }).success).toBe(false);
    expect(inviteMemberSchema.safeParse({ email: 'a@b.co', role: 'admin' }).success).toBe(true);
  });

  it('aceita apenas UUIDs e tokens no formato esperado', () => {
    expect(changeRoleSchema.safeParse({ memberId: '1 or 1=1', role: 'viewer' }).success).toBe(false);
    expect(invitationTokenSchema.safeParse('f'.repeat(64)).success).toBe(true);
    expect(invitationTokenSchema.safeParse("'; drop table x; --").success).toBe(false);
  });
});

describe('papéis e permissões (espelho das regras do banco)', () => {
  it('a matriz exibida corresponde ao papel mínimo de cada ação', () => {
    const roles = Object.fromEntries(PERMISSION_MATRIX.map((p) => [p.id, p.roles]));
    expect(roles.view).toEqual(['owner', 'admin', 'analyst', 'viewer']);
    expect(roles.import).toEqual(['owner', 'admin', 'analyst']);
    expect(roles.manageMembers).toEqual(['owner', 'admin']);
    expect(roles.manageAdmins).toEqual(['owner']);
    expect(roles.deleteOrganization).toEqual(['owner']);
  });

  it('viewer não modifica nada; analyst analisa sem administrar', () => {
    expect(can('viewer', 'import')).toBe(false);
    expect(can('viewer', 'analyze')).toBe(false);
    expect(can('analyst', 'import')).toBe(true);
    expect(can('analyst', 'manageMembers')).toBe(false);
    expect(can('admin', 'deleteOrganization')).toBe(false);
  });

  it('convites e mudanças de papel seguem o gatilho do banco', () => {
    expect(invitableRoles('owner')).toEqual(['admin', 'analyst', 'viewer']);
    expect(invitableRoles('admin')).toEqual(['analyst', 'viewer']);
    expect(invitableRoles('analyst')).toEqual([]);
    expect(assignableRoles('admin', 'viewer', false)).toEqual(['analyst', 'viewer']);
    expect(assignableRoles('admin', 'owner', false)).toEqual([]);
    expect(assignableRoles('admin', 'admin', true)).toEqual([]);
    expect(assignableRoles('owner', 'admin', false)).toEqual(['owner', 'admin', 'analyst', 'viewer']);
    expect(canRemoveMember('admin', 'admin')).toBe(false);
    expect(canRemoveMember('admin', 'viewer')).toBe(true);
    expect(canRemoveMember('analyst', 'viewer')).toBe(false);
  });
});

describe('mensagens de erro', () => {
  it('não revela se o e-mail tem conta', () => {
    expect(mapAuthError({ code: 'invalid_credentials' }).message).toBe('E-mail ou senha incorretos.');
    expect(mapAuthError({ code: 'user_not_found' }).message).not.toMatch(/não existe|não encontrado/i);
  });

  it('traduz códigos do banco e trata RLS como falta de permissão', () => {
    expect(mapDatabaseError({ message: 'solus:last_owner' }).code).toBe('conflict');
    expect(mapDatabaseError({ code: '42501', message: 'new row violates row-level security policy' }).code).toBe('forbidden');
    expect(mapDatabaseError({ code: 'XX000', message: 'detalhe interno com dados' }).message).not.toContain('detalhe');
  });
});

describe('configuração do Supabase', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('fica desativada sem variáveis, sem quebrar a aplicação', () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    expect(getSupabaseConfig()).toBeNull();
  });

  it('exige https fora de localhost e aceita a chave anon legada', () => {
    vi.stubEnv('SUPABASE_URL', 'http://projeto.supabase.co');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_1234567890abcdef');
    expect(getSupabaseConfig()).toBeNull();
    vi.stubEnv('SUPABASE_URL', 'https://projeto.supabase.co/');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiJ9.legacy-anon');
    expect(getSupabaseConfig()).toEqual({ url: 'https://projeto.supabase.co', publishableKey: 'eyJhbGciOiJIUzI1NiJ9.legacy-anon' });
  });

  it('os links de e-mail usam SITE_URL, nunca o Host da requisição', () => {
    vi.stubEnv('SITE_URL', 'https://app.solus.example/');
    expect(getSiteUrl()).toBe('https://app.solus.example');
    vi.stubEnv('SITE_URL', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'solus-psi.vercel.app');
    expect(getSiteUrl()).toBe('https://solus-psi.vercel.app');
  });
});

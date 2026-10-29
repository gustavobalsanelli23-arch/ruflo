import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/auth/actions', () => ({
  signInAction: vi.fn(async () => ({ status: 'idle' })),
  resendConfirmationAction: vi.fn(),
  sessionStatusAction: vi.fn(async () => ({ active: true })),
  signOutAction: vi.fn(),
}));
vi.mock('@/modules/organizations/actions', () => ({
  changeMemberRoleAction: vi.fn(),
  inviteMemberAction: vi.fn(),
  removeMemberAction: vi.fn(),
  revokeInvitationAction: vi.fn(),
}));

const { signInAction } = await import('@/modules/auth/actions');
const { SignInForm } = await import('@/modules/auth/sign-in-form');
const { TeamSection } = await import('@/modules/settings/team-section');

const members = [
  { id: 'm1', userId: 'u-owner', name: 'Olga Dona', email: 'olga@x.co', role: 'owner' as const, joinedAt: '2026-10-01T10:00:00Z' },
  { id: 'm2', userId: 'u-admin', name: 'Abel Admin', email: 'abel@x.co', role: 'admin' as const, joinedAt: '2026-10-02T10:00:00Z' },
  { id: 'm3', userId: 'u-analyst', name: 'Ana Lista', email: 'ana@x.co', role: 'analyst' as const, joinedAt: '2026-10-03T10:00:00Z' },
  { id: 'm4', userId: 'u-viewer', name: 'Vera Leitora', email: 'vera@x.co', role: 'viewer' as const, joinedAt: '2026-10-04T10:00:00Z' },
];

describe('formulário de entrar', () => {
  it('a validação no navegador impede o envio e explica cada campo', async () => {
    render(<SignInForm enabled />);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(signInAction).not.toHaveBeenCalled();
  });

  it('corrigir um campo limpa só o erro dele', async () => {
    render(<SignInForm enabled />);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await userEvent.type(screen.getByLabelText('E-mail'), 'a');
    expect(screen.queryByText('Informe seu e-mail.')).not.toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
  });

  it('desativado quando o acesso não está configurado', () => {
    render(<SignInForm enabled={false} />);
    expect(screen.getByLabelText('E-mail')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });
});

describe('membros da organização', () => {
  const rowOf = (name: string) => screen.getByText(name).closest('tr')!;

  it('admin altera e remove apenas analistas e leitores', () => {
    render(<TeamSection members={members} invitations={[]} role="admin" currentUserId="u-admin" />);
    expect(screen.getByRole('button', { name: 'Convidar pessoa' })).toBeInTheDocument();
    expect(within(rowOf('Olga Dona')).queryByRole('combobox')).toBeNull();
    expect(within(rowOf('Olga Dona')).queryByRole('button', { name: /Remover/ })).toBeNull();
    expect(within(rowOf('Abel Admin')).queryByRole('combobox')).toBeNull();
    expect(within(rowOf('Abel Admin')).getByText('Você')).toBeInTheDocument();
    expect(within(rowOf('Ana Lista')).getByRole('combobox', { name: 'Papel de Ana Lista' })).toBeInTheDocument();
    expect(within(rowOf('Vera Leitora')).getByRole('button', { name: 'Remover Vera Leitora' })).toBeInTheDocument();
  });

  it('owner gerencia todos, menos a própria remoção', () => {
    render(<TeamSection members={members} invitations={[]} role="owner" currentUserId="u-owner" />);
    expect(within(rowOf('Abel Admin')).getByRole('combobox')).toBeInTheDocument();
    expect(within(rowOf('Abel Admin')).getByRole('button', { name: 'Remover Abel Admin' })).toBeInTheDocument();
    expect(within(rowOf('Olga Dona')).queryByRole('button', { name: /Remover/ })).toBeNull();
  });

  it.each(['analyst', 'viewer'] as const)('%s só visualiza a equipe', (role) => {
    render(<TeamSection members={members} invitations={[]} role={role} currentUserId="u-analyst" />);
    expect(screen.queryByRole('button', { name: 'Convidar pessoa' })).toBeNull();
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /Remover/ })).toHaveLength(0);
    expect(screen.queryByText('Convites pendentes')).toBeNull();
  });
});

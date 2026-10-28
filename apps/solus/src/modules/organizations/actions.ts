'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSiteUrl } from '@/lib/env';
import { logServerError } from '@/lib/log';
import { mapDatabaseError, SESSION_EXPIRED } from '@/lib/supabase/errors';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fieldErrors } from '@/schemas/auth';
import {
  changeRoleSchema,
  createOrganizationSchema,
  deleteOrganizationSchema,
  invitationIdSchema,
  invitationTokenSchema,
  inviteMemberSchema,
  memberIdSchema,
  organizationIdSchema,
  renameOrganizationSchema,
  updateProfileSchema,
} from '@/schemas/organization';
import { getSessionUser } from '@/services/session';
import { ACTIVE_ORG_COOKIE, authorize, loadWorkspace, PENDING_INVITE_COOKIE } from '@/services/workspace';
import type { FormState } from '@/modules/auth/form-state';

/**
 * Organization and membership Server Actions. None of them accepts an
 * organization id from the browser for writes: the target is the active
 * organization, re-validated against the user's memberships, and the
 * database checks the role again (RLS + guard trigger + RPC checks).
 */

const ORG_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
};

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

function failure(error: { code?: string; message?: string } | null, scope: string): FormState {
  const mapped = mapDatabaseError(error);
  if (mapped.code === 'unknown') logServerError(scope, error);
  return { status: 'error', code: mapped.code, message: mapped.message };
}

function refresh() {
  revalidatePath('/', 'layout');
}

/* ---------- Create and switch ---------- */

export async function createOrganizationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = { name: text(formData, 'name').slice(0, 80) };
  const parsed = createOrganizationSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  if (!supabase || !(await getSessionUser())) return { status: 'error', code: 'unauthenticated', message: SESSION_EXPIRED, values };

  const { data, error } = await supabase.rpc('create_organization', { p_name: parsed.data.name });
  if (error || !data) return { ...failure(error, 'organização: criar'), values };

  (await cookies()).set(ACTIVE_ORG_COOKIE, data, ORG_COOKIE_OPTIONS);
  refresh();
  redirect('/visao-geral');
}

export async function switchOrganizationAction(organizationId: string): Promise<FormState> {
  const parsed = organizationIdSchema.safeParse({ organizationId });
  if (!parsed.success) return { status: 'error', message: 'Organização inválida.' };
  const workspace = await loadWorkspace();
  if (!workspace) return { status: 'error', code: 'unauthenticated', message: SESSION_EXPIRED };
  // The cookie is only a preference; it is still only honoured for memberships.
  if (!workspace.memberships.some((m) => m.organizationId === parsed.data.organizationId)) {
    return { status: 'error', code: 'forbidden', message: 'Você não faz parte desta organização.' };
  }
  (await cookies()).set(ACTIVE_ORG_COOKIE, parsed.data.organizationId, ORG_COOKIE_OPTIONS);
  refresh();
  return { status: 'success' };
}

/* ---------- Organization settings ---------- */

export async function renameOrganizationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = renameOrganizationSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error) };
  const auth = await authorize('admin');
  if (!auth.ok) return { status: 'error', ...auth.error };

  const { data, error } = await auth.supabase
    .from('organizations')
    .update({ name: parsed.data.name })
    .eq('id', auth.workspace.active.organizationId)
    .select('id');
  if (error) return failure(error, 'organização: renomear');
  if (!data.length) return { status: 'error', code: 'forbidden', message: 'Você não tem permissão para renomear esta organização.' };
  refresh();
  return { status: 'success', message: 'Nome da organização atualizado.' };
}

export async function deleteOrganizationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = deleteOrganizationSchema.safeParse({ confirmation: formData.get('confirmation') });
  const auth = await authorize('owner');
  if (!auth.ok) return { status: 'error', ...auth.error };
  if (!parsed.success || parsed.data.confirmation !== auth.workspace.active.name) {
    return { status: 'error', fieldErrors: { confirmation: 'Digite o nome exatamente como aparece.' } };
  }

  const { data, error } = await auth.supabase.from('organizations').delete().eq('id', auth.workspace.active.organizationId).select('id');
  if (error) return failure(error, 'organização: excluir');
  if (!data.length) return { status: 'error', code: 'forbidden', message: 'Somente proprietários podem excluir a organização.' };

  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  refresh();
  redirect('/visao-geral');
}

export async function leaveOrganizationAction(): Promise<FormState> {
  const auth = await authorize('viewer');
  if (!auth.ok) return { status: 'error', ...auth.error };
  const { data, error } = await auth.supabase.from('organization_members').delete().eq('id', auth.workspace.active.memberId).select('id');
  if (error) return failure(error, 'organização: sair');
  if (!data.length) return { status: 'error', message: 'Não foi possível sair desta organização.' };
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  refresh();
  redirect('/visao-geral');
}

/* ---------- Members ---------- */

export async function changeMemberRoleAction(memberId: string, role: string): Promise<FormState> {
  const parsed = changeRoleSchema.safeParse({ memberId, role });
  if (!parsed.success) return { status: 'error', message: 'Papel inválido.' };
  const auth = await authorize('admin');
  if (!auth.ok) return { status: 'error', ...auth.error };

  const { data, error } = await auth.supabase
    .from('organization_members')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.memberId)
    .eq('organization_id', auth.workspace.active.organizationId)
    .select('id');
  if (error) return failure(error, 'membros: alterar papel');
  if (!data.length) return { status: 'error', code: 'not_found', message: 'Membro não encontrado nesta organização.' };
  refresh();
  return { status: 'success' };
}

export async function removeMemberAction(memberId: string): Promise<FormState> {
  const parsed = memberIdSchema.safeParse({ memberId });
  if (!parsed.success) return { status: 'error', message: 'Membro inválido.' };
  const auth = await authorize('admin');
  if (!auth.ok) return { status: 'error', ...auth.error };

  const { data, error } = await auth.supabase
    .from('organization_members')
    .delete()
    .eq('id', parsed.data.memberId)
    .eq('organization_id', auth.workspace.active.organizationId)
    .select('id');
  if (error) return failure(error, 'membros: remover');
  if (!data.length) return { status: 'error', code: 'not_found', message: 'Membro não encontrado nesta organização.' };
  refresh();
  return { status: 'success' };
}

/* ---------- Invitations ---------- */

export async function inviteMemberAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, 'email').slice(0, 254), role: text(formData, 'role') };
  const parsed = inviteMemberSchema.safeParse({ email: formData.get('email'), role: formData.get('role') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), values };
  const auth = await authorize('admin');
  if (!auth.ok) return { status: 'error', ...auth.error, values };

  const { data, error } = await auth.supabase.rpc('create_invitation', {
    p_organization_id: auth.workspace.active.organizationId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  });
  const invitation = data?.[0];
  if (error || !invitation) {
    const mapped = failure(error, 'convites: criar');
    if (mapped.code === 'conflict' || mapped.code === 'validation') return { status: 'error', fieldErrors: { email: mapped.message ?? '' }, values };
    return { ...mapped, values };
  }
  refresh();
  return {
    status: 'success',
    email: parsed.data.email,
    payload: { link: `${getSiteUrl()}/convite/${invitation.invitation_token}`, expiresAt: invitation.invitation_expires_at },
  };
}

export async function revokeInvitationAction(invitationId: string): Promise<FormState> {
  const parsed = invitationIdSchema.safeParse({ invitationId });
  if (!parsed.success) return { status: 'error', message: 'Convite inválido.' };
  const auth = await authorize('admin');
  if (!auth.ok) return { status: 'error', ...auth.error };

  const { data, error } = await auth.supabase
    .from('organization_invitations')
    .delete()
    .eq('id', parsed.data.invitationId)
    .eq('organization_id', auth.workspace.active.organizationId)
    .select('id');
  if (error) return failure(error, 'convites: revogar');
  if (!data.length) return { status: 'error', code: 'not_found', message: 'Convite não encontrado.' };
  refresh();
  return { status: 'success' };
}

export async function acceptInvitationAction(token: string): Promise<FormState> {
  const parsed = invitationTokenSchema.safeParse(token);
  if (!parsed.success) return { status: 'error', message: 'Convite inválido.' };
  const supabase = await createSupabaseServerClient();
  if (!supabase || !(await getSessionUser())) return { status: 'error', code: 'unauthenticated', message: SESSION_EXPIRED };

  const { data, error } = await supabase.rpc('accept_invitation', { p_token: parsed.data });
  if (error || !data) return failure(error, 'convites: aceitar');

  const store = await cookies();
  store.delete(PENDING_INVITE_COOKIE);
  store.set(ACTIVE_ORG_COOKIE, data, ORG_COOKIE_OPTIONS);
  refresh();
  redirect('/visao-geral');
}

/** "Not now": forget the pending invitation so the app stops redirecting to it. */
export async function dismissInvitationAction() {
  (await cookies()).delete(PENDING_INVITE_COOKIE);
  redirect('/visao-geral');
}

/* ---------- Profile ---------- */

export async function updateProfileAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = updateProfileSchema.safeParse({ fullName: formData.get('fullName') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  if (!supabase || !user) return { status: 'error', code: 'unauthenticated', message: SESSION_EXPIRED };

  const { data, error } = await supabase.from('profiles').update({ full_name: parsed.data.fullName }).eq('id', user.id).select('id');
  if (error) return failure(error, 'perfil: atualizar');
  if (!data.length) return { status: 'error', message: 'Perfil não encontrado.' };
  refresh();
  return { status: 'success', message: 'Perfil atualizado.' };
}

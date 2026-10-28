import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { hasRole } from '@/lib/auth/permissions';
import { loginPath } from '@/lib/auth/redirect';
import type { Role } from '@/lib/data/types';
import { logServerError } from '@/lib/log';
import { mapDatabaseError, SESSION_EXPIRED, type MappedError } from '@/lib/supabase/errors';
import { createSupabaseServerClient, type SolusClient } from '@/lib/supabase/server';
import { invitationTokenSchema } from '@/schemas/organization';
import { getSessionUser } from './session';

/** Preferred organization. A hint only: it is re-validated against the user's memberships on every request. */
export const ACTIVE_ORG_COOKIE = 'solus-org';
/** Invitation link opened before signing in, resumed after authentication. */
export const PENDING_INVITE_COOKIE = 'solus-convite';
/** Set by the proxy with the requested path (incoming values are overwritten). */
export const PATH_HEADER = 'x-solus-path';

export interface Membership {
  memberId: string;
  organizationId: string;
  name: string;
  slug: string;
  role: Role;
}

export interface WorkspaceUser {
  id: string;
  email: string;
  fullName: string | null;
  displayName: string;
  initials: string;
}

export interface Workspace {
  user: WorkspaceUser;
  memberships: Membership[];
  active: Membership | null;
}

export type ActiveWorkspace = Workspace & { active: Membership };

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts.at(-1)![0]}` : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/**
 * The signed-in user, their organizations and the active one. All reads go
 * through RLS with the user's own session. Cached per request.
 */
export const loadWorkspace = cache(async (): Promise<Workspace | null> => {
  const session = await getSessionUser();
  const supabase = await createSupabaseServerClient();
  if (!session || !supabase) return null;

  const [profile, members] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', session.id).maybeSingle(),
    supabase
      .from('organization_members')
      .select('id, role, organization:organizations(id, name, slug)')
      .eq('user_id', session.id)
      .order('created_at'),
  ]);
  if (profile.error || members.error) {
    logServerError('workspace: leitura', profile.error ?? members.error);
    throw new Error('Não foi possível carregar sua organização.');
  }

  const memberships: Membership[] = members.data.flatMap((row) =>
    row.organization
      ? [{ memberId: row.id, organizationId: row.organization.id, name: row.organization.name, slug: row.organization.slug, role: row.role }]
      : [],
  );

  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.organizationId === preferred) ?? memberships[0] ?? null;

  const email = profile.data?.email ?? session.email;
  const fullName = profile.data?.full_name ?? null;
  const displayName = fullName ?? email.split('@')[0] ?? 'Você';
  return {
    user: { id: session.id, email, fullName, displayName, initials: initialsOf(displayName) },
    memberships,
    active,
  };
});

/** The requested path, as recorded by the proxy, for post-login redirects. */
export async function currentPath() {
  return (await headers()).get(PATH_HEADER);
}

/**
 * For pages inside the app: requires a session and an organization.
 * Defense in depth: the proxy already redirected anonymous visitors.
 */
export async function requireWorkspace(): Promise<ActiveWorkspace> {
  const workspace = await loadWorkspace();
  if (!workspace) redirect(loginPath({ next: await currentPath(), reason: 'sessao-expirada' }));

  const pending = (await cookies()).get(PENDING_INVITE_COOKIE)?.value;
  if (pending && invitationTokenSchema.safeParse(pending).success) redirect(`/convite/${pending}`);

  if (!workspace.active) redirect('/organizacoes/nova');
  return workspace as ActiveWorkspace;
}

export type Authorized = { ok: true; workspace: ActiveWorkspace; supabase: SolusClient };
export type Unauthorized = { ok: false; error: MappedError };

/**
 * For Server Actions: the active organization (from the cookie, re-validated
 * against the user's memberships) and the minimum role required. The
 * database applies the same rule again through RLS.
 */
export async function authorize(minimum: Role): Promise<Authorized | Unauthorized> {
  const supabase = await createSupabaseServerClient();
  let workspace: Workspace | null;
  try {
    workspace = await loadWorkspace();
  } catch (error) {
    return { ok: false, error: mapDatabaseError(error as { message?: string }) };
  }
  if (!workspace || !supabase) return { ok: false, error: { code: 'unauthenticated', message: SESSION_EXPIRED } };
  if (!workspace.active) return { ok: false, error: { code: 'forbidden', message: 'Crie ou entre em uma organização primeiro.' } };
  if (!hasRole(workspace.active.role, minimum)) {
    return { ok: false, error: { code: 'forbidden', message: 'Seu papel nesta organização não permite esta ação.' } };
  }
  return { ok: true, workspace: workspace as ActiveWorkspace, supabase };
}

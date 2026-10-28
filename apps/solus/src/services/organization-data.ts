import 'server-only';
import type { Role } from '@/lib/data/types';
import { logServerError } from '@/lib/log';
import type { SolusClient } from '@/lib/supabase/server';

/**
 * Reads for the settings and data screens. Every query runs with the
 * signed-in user's session, so RLS decides what comes back; the
 * organization filter only narrows it to the active organization.
 */

export interface MemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface InvitationRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  expired: boolean;
  createdAt: string;
}

function unwrap<T>(scope: string, result: { data: T | null; error: unknown }): T {
  if (result.error || result.data === null) {
    logServerError(scope, result.error);
    throw new Error('Não foi possível carregar os dados desta organização.');
  }
  return result.data;
}

export async function listMembers(supabase: SolusClient, organizationId: string): Promise<MemberRow[]> {
  const rows = unwrap(
    'membros: listar',
    await supabase
      .from('organization_members')
      .select('id, user_id, role, created_at, profile:profiles(full_name, email)')
      .eq('organization_id', organizationId)
      .order('created_at'),
  );
  return rows.map((row) => {
    const email = row.profile?.email ?? '';
    return {
      id: row.id,
      userId: row.user_id,
      name: row.profile?.full_name ?? (email.split('@')[0] || 'Pessoa sem nome'),
      email,
      role: row.role,
      joinedAt: row.created_at,
    };
  });
}

export async function listPendingInvitations(supabase: SolusClient, organizationId: string): Promise<InvitationRow[]> {
  const rows = unwrap(
    'convites: listar',
    await supabase
      .from('organization_invitations')
      .select('id, email, role, expires_at, created_at')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  );
  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
    expired: new Date(row.expires_at).getTime() <= now,
    createdAt: row.created_at,
  }));
}

/** Whether the organization has any processed business data yet. */
export async function hasAnalyticsData(supabase: SolusClient, organizationId: string) {
  const { count, error } = await supabase
    .from('data_imports')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['completed', 'with_errors']);
  if (error) {
    logServerError('importações: contar', error);
    throw new Error('Não foi possível verificar os dados desta organização.');
  }
  return (count ?? 0) > 0;
}

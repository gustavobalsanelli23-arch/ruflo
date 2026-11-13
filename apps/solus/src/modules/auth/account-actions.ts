'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginPath } from '@/lib/auth/redirect';
import { logServerError } from '@/lib/log';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { deleteAccountSchema, fieldErrors } from '@/schemas/auth';
import { removeOrganizationFiles } from '@/services/imports';
import { consumeRateLimits } from '@/services/rate-limit';
import { RECOVERY_COOKIE } from '@/services/recovery';
import { getSessionUser } from '@/services/session';
import { ACTIVE_ORG_COOKIE } from '@/services/workspace';
import type { FormState } from './form-state';

/**
 * Deletes the signed-in person's account (LGPD art. 18, VI). Organizations
 * where they are the only member are deleted with their data and files.
 * Organizations that would be left with other people but no owner block the
 * deletion: ownership must be handed over first, so nobody loses access to
 * their company's data.
 */

const UNAVAILABLE = 'Não foi possível excluir a conta agora. Nada foi apagado; tente de novo em instantes.';

export async function deleteAccountAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = deleteAccountSchema.safeParse({ password: formData.get('password'), confirmation: formData.get('confirmation') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  if (!supabase || !user) return { status: 'error', code: 'unauthenticated', message: 'Sua sessão expirou. Entre novamente.' };
  const admin = createSupabaseAdminClient();
  if (!admin) return { status: 'error', code: 'unavailable', message: UNAVAILABLE };

  const verdict = await consumeRateLimits([{ bucket: `account-delete:${user.id}`, limit: 5, windowSeconds: 15 * 60 }]);
  if (verdict !== 'allowed') return { status: 'error', code: verdict === 'limited' ? 'rate_limited' : 'unavailable', message: UNAVAILABLE };

  const check = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.password });
  if (check.error) return { status: 'error', fieldErrors: { password: 'Senha incorreta.' } };

  const memberships = await supabase.from('organization_members').select('organization_id, role, organization:organizations(name)').eq('user_id', user.id);
  if (memberships.error) {
    logServerError('conta: excluir (organizações)', memberships.error);
    return { status: 'error', code: 'unavailable', message: UNAVAILABLE };
  }

  const toDelete: string[] = [];
  const blocking: string[] = [];
  for (const membership of memberships.data) {
    const others = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', membership.organization_id)
      .neq('user_id', user.id);
    if (others.error) {
      logServerError('conta: excluir (membros)', others.error);
      return { status: 'error', code: 'unavailable', message: UNAVAILABLE };
    }
    if (others.data.length === 0) toDelete.push(membership.organization_id);
    else if (membership.role === 'owner' && !others.data.some((member) => member.role === 'owner')) {
      blocking.push(membership.organization?.name ?? 'uma organização');
    }
  }
  if (blocking.length) {
    return {
      status: 'error',
      code: 'conflict',
      message: `Você é o único proprietário de: ${blocking.join(', ')}. Torne outra pessoa proprietária ou exclua a organização antes de excluir a conta.`,
    };
  }

  for (const organizationId of toDelete) {
    if (!(await removeOrganizationFiles(supabase, organizationId))) return { status: 'error', code: 'unavailable', message: UNAVAILABLE };
    const removed = await supabase.from('organizations').delete().eq('id', organizationId);
    if (removed.error) {
      logServerError('conta: excluir (organização)', removed.error);
      return { status: 'error', code: 'unavailable', message: UNAVAILABLE };
    }
  }

  // Removes the login and, by cascade, the profile, memberships and conversations with the analyst.
  const deleted = await admin.auth.admin.deleteUser(user.id);
  if (deleted.error) {
    logServerError('conta: excluir (usuário)', deleted.error);
    return { status: 'error', code: 'unavailable', message: UNAVAILABLE };
  }

  const store = await cookies();
  store.delete(ACTIVE_ORG_COOKIE);
  store.delete(RECOVERY_COOKIE);
  await supabase.auth.signOut({ scope: 'local' });
  redirect(loginPath({ reason: 'conta-excluida' }));
}

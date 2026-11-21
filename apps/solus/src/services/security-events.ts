import 'server-only';
import { logSecurityEvent, logServerError, type SecurityEvent } from '@/lib/log';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * A security event: one line in the runtime log (as before) and one row in
 * private.security_events, kept 180 days (the Vercel log keeps 1 hour).
 * Never throws and never delays the request beyond the insert; a failed
 * insert is only logged.
 */
export async function reportSecurityEvent(event: Exclude<SecurityEvent, 'session_expired'>, label?: string) {
  logSecurityEvent(event, label);
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { error } = await admin.rpc('record_security_event', { p_event: event, p_label: label ?? null });
  if (error) logServerError('seguranca: registrar', error);
}

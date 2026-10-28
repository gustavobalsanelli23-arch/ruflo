import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Client with the secret (service_role) key. It bypasses RLS, so it is used
 * for exactly one thing: the pre-authentication rate limiter
 * (public.check_rate_limit, executable only by service_role). The
 * `server-only` import makes the build fail if this module ever reaches a
 * client bundle.
 */
export function createSupabaseAdminClient() {
  const config = getSupabaseConfig();
  const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!config || !secret) return null;
  return createClient<Database>(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

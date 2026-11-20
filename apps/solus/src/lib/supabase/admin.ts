import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Client with the secret (service_role) key. It bypasses RLS, so it is used
 * for these things only, all RPCs only service_role may execute:
 *   * the pre-authentication rate limiter (public.check_rate_limit);
 *   * writing the Intelligence Engine's results (public.sync_opportunities),
 *     after the server checked the user's role;
 *   * saving the org-wide AI summary (public.save_ai_summary), after the
 *     server ran the model and checked the numbers;
 *   * confirming an upload (public.confirm_verified_upload), after the server
 *     checked the stored file's SHA-256 and format;
 *   * billing (link_billing_customer, apply_subscription), from Stripe's
 *     answers and the webhook.
 * The `server-only` import makes the build fail if this module ever reaches
 * a client bundle.
 */
export function createSupabaseAdminClient() {
  const config = getSupabaseConfig();
  const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!config || !secret) return null;
  return createClient<Database>(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

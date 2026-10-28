import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { logServerError } from '@/lib/log';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Limits for operations that happen before there is a session (sign-in,
 * sign-up, password recovery, resending confirmation). Counters live in
 * PostgreSQL (private.rate_limits), so every server instance shares them —
 * an in-memory counter would reset per instance and per cold start.
 *
 * Operations made by signed-in users are limited inside the database
 * functions themselves (create_organization, create_invitation).
 */

export interface RateRule {
  bucket: string;
  limit: number;
  windowSeconds: number;
}

export type RateVerdict = 'allowed' | 'limited' | 'unavailable';

/** Short, irreversible key for personal data (e-mail) used in bucket names. */
export function fingerprint(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32);
}

/**
 * Client IP as seen by the hosting platform. On Vercel the platform sets
 * x-forwarded-for; self-hosted deployments must sit behind a proxy that
 * overwrites it (see docs/seguranca.md).
 */
export async function clientIp() {
  const list = await headers();
  const forwarded = list.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || list.get('x-real-ip') || 'unknown';
}

export async function consumeRateLimits(rules: RateRule[]): Promise<RateVerdict> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    // Without the secret key there is no shared counter. Production refuses
    // (fail closed); development continues so the app can be explored.
    if (process.env.NODE_ENV === 'production') {
      logServerError('rate-limit: SUPABASE_SECRET_KEY ausente', { code: 'missing_secret' });
      return 'unavailable';
    }
    return 'allowed';
  }
  for (const rule of rules) {
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_bucket: rule.bucket,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      logServerError('rate-limit', error);
      return 'unavailable';
    }
    if (data === false) return 'limited';
  }
  return 'allowed';
}

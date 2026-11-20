import 'server-only';
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { logSecurityEvent, logServerError } from '@/lib/log';
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

let fingerprintKey: string | null = null;

/**
 * Short, irreversible key for personal data (e-mail, IP) used in bucket
 * names. Keyed (HMAC with a key derived from the server secret), so whoever
 * reads private.rate_limits cannot match it against a list of e-mails or
 * addresses. Without the secret (development) the counters are off anyway.
 */
export function fingerprint(value: string) {
  fingerprintKey ??= createHmac('sha256', (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'solus-dev').trim())
    .update('solus-rate-limit-v1')
    .digest('hex');
  return createHmac('sha256', fingerprintKey).update(value.trim().toLowerCase()).digest('hex').slice(0, 32);
}

/**
 * Client IP as seen by the hosting platform. On Vercel, x-vercel-forwarded-for
 * is set by the platform and cannot come from the client; x-forwarded-for is
 * the fallback for self-hosted deployments, which must sit behind a proxy
 * that overwrites it (see docs/seguranca.md). Bucket names use fingerprint(ip).
 */
export async function clientIp() {
  const list = await headers();
  const first = (name: string) => list.get(name)?.split(',')[0]?.trim();
  return first('x-vercel-forwarded-for') || first('x-forwarded-for') || list.get('x-real-ip') || 'unknown';
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
    if (data === false) {
      // Only the bucket family (e.g. "signin:ip"), never the fingerprint.
      logSecurityEvent('rate_limited', rule.bucket.split(':').slice(0, 2).join(':'));
      return 'limited';
    }
  }
  return 'allowed';
}

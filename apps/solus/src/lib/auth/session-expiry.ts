/**
 * Session lifetime, enforced by the proxy on every request (the hosted
 * Supabase time-box and inactivity timeout need a paid plan):
 *   * absolute: at most SESSION_MAX_AGE after the sign-in itself, read from
 *     the JWT's `amr` timestamp, which refreshes keep and the client cannot
 *     change;
 *   * inactivity: ACTIVITY_COOKIE holds the last request time and lives
 *     SESSION_IDLE; a session idle longer than that ends.
 */

export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
export const SESSION_IDLE = 12 * 60 * 60;
export const ACTIVITY_COOKIE = 'solus-atividade';

interface Claims {
  iat?: number;
  amr?: { method?: string; timestamp?: number }[] | unknown;
}

/** Sign-in time in seconds: the earliest `amr` entry, else the token's iat. */
export function signedInAt(claims: Claims): number | null {
  const stamps = Array.isArray(claims.amr)
    ? claims.amr.map((entry) => (entry as { timestamp?: unknown })?.timestamp).filter((stamp): stamp is number => typeof stamp === 'number')
    : [];
  if (stamps.length) return Math.min(...stamps);
  return typeof claims.iat === 'number' ? claims.iat : null;
}

/**
 * Whether the session must end now. `lastActivity` is the activity cookie
 * (unix seconds) or null when absent: absent after a sign-in older than the
 * idle window means the cookie expired, i.e. the session sat idle.
 */
export function sessionExpired(claims: Claims, lastActivity: string | undefined, now = Math.floor(Date.now() / 1000)): 'max-age' | 'idle' | null {
  const since = signedInAt(claims);
  if (since !== null && now - since > SESSION_MAX_AGE) return 'max-age';
  const last = lastActivity && /^\d{1,12}$/.test(lastActivity) ? Number(lastActivity) : null;
  if (last !== null) return now - last > SESSION_IDLE ? 'idle' : null;
  return since !== null && now - since > SESSION_IDLE ? 'idle' : null;
}

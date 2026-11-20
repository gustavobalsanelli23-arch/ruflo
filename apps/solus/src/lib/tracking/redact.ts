/**
 * Strips one-time secrets from what goes to product analytics. Recovery and
 * sign-up confirmation links carry `token_hash` (or `code`) in the query,
 * invitations carry their token in the path (`/convite/<token>`), and the
 * sign-in redirect repeats it in `next`. A page view sends the address as
 * $current_url, $pathname, $referrer…, so an unused token would be readable
 * by anyone with access to the analytics project.
 */

const SECRET_QUERY = /([?&](?:token_hash|token|code|next)=)[^&#\s"']*/gi;
const INVITE_PATH = /\/convite\/[^/?#&\s"']+/g;
const INVITE_PATH_ENCODED = /%2Fconvite%2F[^&#\s"'%]+/gi;

export function redactUrl(value: string): string {
  if (!value.includes('convite') && !/(?:token_hash|token|code|next)=/i.test(value)) return value;
  return value.replace(INVITE_PATH, '/convite/:token').replace(INVITE_PATH_ENCODED, '%2Fconvite%2F%3Atoken').replace(SECRET_QUERY, '$1[removido]');
}

/** Pages whose address holds a secret: their session-replay frames are dropped. */
export function isSecretPage(pathname: string, search: string): boolean {
  return pathname.startsWith('/auth/') || pathname.startsWith('/convite/') || /(?:^|[?&])(?:token_hash|code|token)=/.test(search);
}

function redactDeep(value: unknown, depth: number): unknown {
  if (typeof value === 'string') return redactUrl(value);
  if (depth > 3 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) out[key] = redactDeep(item, depth + 1);
  return out;
}

interface Captured {
  event: string;
  properties: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
}

/**
 * PostHog `before_send`: replay frames recorded on a secret page are dropped
 * (the frame data holds the address); every other event has its addresses
 * redacted.
 */
export function redactEvent<T extends Captured>(event: T, location: { pathname: string; search: string }): T | null {
  if (event.event === '$snapshot') return isSecretPage(location.pathname, location.search) ? null : event;
  return {
    ...event,
    properties: redactDeep(event.properties, 0) as T['properties'],
    ...(event.$set && { $set: redactDeep(event.$set, 0) as T['$set'] }),
    ...(event.$set_once && { $set_once: redactDeep(event.$set_once, 0) as T['$set_once'] }),
  };
}

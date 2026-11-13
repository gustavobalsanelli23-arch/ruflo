import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Proof that this browser opened a password-recovery link for this account
 * in the last 15 minutes. Required to set a new password without typing the
 * old one, so a hijacked session alone cannot change it.
 *
 * The cookie is `<userId>.<issuedAtSeconds>.<hmac>`, signed on the server: the
 * session holder knows the user id, so an unsigned value could be forged. The
 * issue time is checked here, not only through the cookie's maxAge, which the
 * client controls.
 */
export const RECOVERY_COOKIE = 'solus-recuperacao';
export const RECOVERY_WINDOW_SECONDS = 15 * 60;

// Derived from the Supabase secret key (server-only, already required in
// production). Without it (local development) a per-process random key is
// used: grants then last until the server restarts, never longer.
let fallbackKey: Buffer | null = null;
function signingKey(): Buffer {
  const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (secret) return createHmac('sha256', secret).update('solus-recovery-grant-v1').digest();
  fallbackKey ??= randomBytes(32);
  return fallbackKey;
}

function sign(payload: string) {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

/** Cookie value granting recovery to `userId`, issued now. */
export function recoveryGrantValue(userId: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload = `${userId}.${nowSeconds}`;
  return `${payload}.${sign(payload)}`;
}

/** True only for a grant signed by this server, for this user, still inside the window. */
export function isValidRecoveryGrant(value: string | undefined, userId: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [id = '', issued = '', mac = ''] = parts;
  if (id !== userId || !/^\d{1,12}$/.test(issued)) return false;
  const expected = Buffer.from(sign(`${id}.${issued}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const age = nowSeconds - Number(issued);
  return age >= 0 && age <= RECOVERY_WINDOW_SECONDS;
}

export async function hasRecoveryGrant(userId: string) {
  return isValidRecoveryGrant((await cookies()).get(RECOVERY_COOKIE)?.value, userId);
}

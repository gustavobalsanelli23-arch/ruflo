import 'server-only';
import { cookies } from 'next/headers';

/**
 * Proof that this browser opened a password-recovery link for this account
 * in the last 15 minutes. Required to set a new password without typing the
 * old one, so a hijacked session alone cannot change it. The cookie holds the
 * id of the user the link was verified for: a grant obtained for one account
 * is worthless for another.
 */
export const RECOVERY_COOKIE = 'solus-recuperacao';
export const RECOVERY_WINDOW_SECONDS = 15 * 60;

export async function hasRecoveryGrant(userId: string) {
  return (await cookies()).get(RECOVERY_COOKIE)?.value === userId;
}

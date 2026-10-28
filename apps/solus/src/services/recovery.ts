import 'server-only';
import { cookies } from 'next/headers';

/**
 * Proof that this browser opened a password-recovery link in the last 15
 * minutes. Required to set a new password without typing the old one, so a
 * hijacked session alone cannot change it.
 */
export const RECOVERY_COOKIE = 'solus-recuperacao';
export const RECOVERY_WINDOW_SECONDS = 15 * 60;

export async function hasRecoveryGrant() {
  return (await cookies()).get(RECOVERY_COOKIE)?.value === '1';
}

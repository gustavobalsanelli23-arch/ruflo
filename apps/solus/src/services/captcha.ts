import 'server-only';
import { getCaptchaSecret, getCaptchaSiteKey } from '@/lib/env';
import { logServerError } from '@/lib/log';

/** Field the Turnstile widget adds to the form it sits in. */
export const CAPTCHA_FIELD = 'cf-turnstile-response';

export type CaptchaVerdict = 'ok' | 'failed' | 'unavailable';

/**
 * Checks the Turnstile token with Cloudflare (siteverify). Off (always 'ok')
 * until both keys are configured. When Cloudflare cannot be reached the
 * answer is 'unavailable': the form asks to try again rather than letting
 * an unchecked request through.
 */
export async function verifyCaptcha(formData: FormData, remoteIp: string): Promise<CaptchaVerdict> {
  const secret = getCaptchaSecret();
  if (!secret || !getCaptchaSiteKey()) return 'ok';
  const token = formData.get(CAPTCHA_FIELD);
  if (typeof token !== 'string' || !token || token.length > 2048) return 'failed';

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logServerError('captcha: verificar', { status: response.status });
      return 'unavailable';
    }
    const result = (await response.json()) as { success?: boolean };
    return result.success === true ? 'ok' : 'failed';
  } catch (cause) {
    logServerError('captcha: verificar', cause);
    return 'unavailable';
  }
}

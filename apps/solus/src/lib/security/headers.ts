/**
 * Content Security Policy with a per-request nonce. Scripts run only when
 * they carry the nonce (Next.js adds it to its own scripts); 'strict-dynamic'
 * lets those scripts load the chunks they need. Styles allow inline
 * attributes because the charts and motion library set them at runtime; style
 * attributes cannot execute script.
 *
 * `uploadOrigin` is the Supabase project origin: the browser sends import
 * files straight to Storage with a signed URL (the file never passes through
 * the app server), so that origin, and only it, is allowed in connect-src.
 */
export function buildContentSecurityPolicy(nonce: string, isDev: boolean, uploadOrigin: string | null = null) {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'${uploadOrigin ? ` ${uploadOrigin}` : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
  ];
  if (!isDev) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

/** Headers applied to every response (see next.config.ts). */
export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
] as const;

export function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

import type { CookieOptions } from '@supabase/ssr';

/**
 * Session cookies are HttpOnly: the browser never reads Supabase tokens, so a
 * script injected into the page cannot steal them. Every Supabase call runs on
 * the server (Server Components, Server Actions, proxy).
 */
export const SESSION_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
} satisfies CookieOptions;

/** Cookies written by @supabase/ssr look like `sb-<ref>-auth-token[.N]`. */
export function isSessionCookie(name: string) {
  return name.startsWith('sb-') && name.includes('-auth-token');
}

export function hardenCookie(options: CookieOptions): CookieOptions {
  return { ...options, ...SESSION_COOKIE_OPTIONS };
}

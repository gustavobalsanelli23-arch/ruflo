/**
 * Post-authentication destinations come from the URL (`?next=`), so they are
 * attacker-controlled. Only same-origin relative paths are accepted; anything
 * else falls back to the default, which closes open-redirect attacks such as
 * `//evil.example`, `/\evil.example` or `https://evil.example`.
 */

export const DEFAULT_AFTER_LOGIN = '/visao-geral';

const BLOCKED_PREFIXES = ['/entrar', '/cadastro', '/recuperar-senha', '/auth/'];

export function safeNextPath(value: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // Control characters and backslashes can be normalized by browsers into an
  // absolute URL; reject them outright.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;

  const base = 'https://solus.invalid';
  let parsed: URL;
  try {
    parsed = new URL(value, base);
  } catch {
    return fallback;
  }
  if (parsed.origin !== base) return fallback;
  if (BLOCKED_PREFIXES.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))) {
    return fallback;
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export type LoginReason = 'sessao-expirada' | 'sessao-encerrada' | 'saiu' | 'link-invalido' | 'senha-redefinida';

export function loginPath(options: { next?: string | null; reason?: LoginReason } = {}) {
  const params = new URLSearchParams();
  const next = options.next ? safeNextPath(options.next, '') : '';
  if (next && next !== DEFAULT_AFTER_LOGIN) params.set('next', next);
  if (options.reason) params.set('motivo', options.reason);
  const query = params.toString();
  return query ? `/entrar?${query}` : '/entrar';
}

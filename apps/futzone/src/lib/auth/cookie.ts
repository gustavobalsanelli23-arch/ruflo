import { SESSION_COOKIE } from './verify';

/**
 * Cookie da sessão administrativa: HttpOnly (JavaScript não lê), SameSite=Strict
 * (não acompanha requisições vindas de outros sites), Secure em produção e
 * válido para o site inteiro (exigência do prefixo `__Host-`).
 */
const secure = () => process.env.NODE_ENV === 'production';

export function sessionCookieHeader(token: string, maxAgeSec: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=Strict${secure() ? '; Secure' : ''}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure() ? '; Secure' : ''}`;
}

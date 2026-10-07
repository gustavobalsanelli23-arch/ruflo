import { ADMIN_ROLE, type AdminTokenPayload } from './types';
import { fromBase64Url, timingSafeEqual, toBase64Url, utf8 } from './encoding';

/**
 * Token de sessão assinado com HMAC-SHA256: `<payload base64url>.<assinatura>`.
 * Sem o segredo do servidor não é possível criar nem alterar um token.
 * Usa Web Crypto, então funciona tanto no proxy quanto nas rotas.
 */

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(data)));
}

export async function signToken(payload: AdminTokenPayload, secret: string): Promise<string> {
  const body = toBase64Url(utf8(JSON.stringify(payload)));
  return `${body}.${toBase64Url(await hmac(secret, body))}`;
}

/** Retorna o payload somente se a assinatura, a role e a validade estiverem corretas. */
export async function verifyToken(token: string | undefined, secret: string, now = Date.now()): Promise<AdminTokenPayload | null> {
  if (!token || token.length > 2048) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  let expected: Uint8Array;
  let given: Uint8Array;
  try {
    expected = await hmac(secret, body);
    given = fromBase64Url(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(expected, given)) return null;
  let payload: AdminTokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as AdminTokenPayload;
  } catch {
    return null;
  }
  const nowSec = Math.floor(now / 1000);
  if (payload.role !== ADMIN_ROLE || typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp <= nowSec || payload.iat > nowSec + 60) return null;
  return payload;
}

export function randomId(bytes = 16): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

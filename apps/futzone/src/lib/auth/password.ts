import { fromBase64Url, timingSafeEqual, toBase64Url, utf8 } from './encoding';

/**
 * Hash de senha com PBKDF2-SHA256 (Web Crypto — roda no servidor e no
 * navegador, sem dependências). Formato armazenado nas variáveis de ambiente:
 *
 *   pbkdf2-sha256:<iterações>:<salt base64url>:<hash base64url>
 *
 * Separado por ":" (e não "$") para não sofrer expansão de variáveis em `.env`.
 */
export const PBKDF2_ITERATIONS = 600_000;
const PREFIX = 'pbkdf2-sha256';
const KEY_BYTES = 32;

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, KEY_BYTES * 8);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return [PREFIX, iterations, toBase64Url(salt), toBase64Url(hash)].join(':');
}

export function isValidPasswordHash(stored: string): boolean {
  const parts = stored.split(':');
  return parts.length === 4 && parts[0] === PREFIX && Number(parts[1]) >= 100_000 && parts[2].length > 0 && parts[3].length > 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!isValidPasswordHash(stored)) return false;
  const [, iter, salt, hash] = stored.split(':');
  const actual = await derive(password, fromBase64Url(salt), Number(iter));
  return timingSafeEqual(actual, fromBase64Url(hash));
}

/** Política mínima de senha para os administradores. */
export function passwordProblems(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 12) issues.push('pelo menos 12 caracteres');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) issues.push('letras maiúsculas e minúsculas');
  if (!/\d/.test(password)) issues.push('pelo menos um número');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('pelo menos um símbolo');
  return issues;
}

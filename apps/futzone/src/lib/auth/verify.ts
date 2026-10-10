import { isAuthReady, readAuthConfig, toPublicAdmin, type AuthConfig } from './config';
import { revocationStore, type SessionRevocationStore } from './revocation';
import { verifyToken } from './token';
import type { AdminSessionInfo, AdminTokenPayload } from './types';

/**
 * Em produção o cookie usa o prefixo `__Host-`: o navegador só o aceita com
 * `Secure`, `Path=/` e sem `Domain` — não pode ser plantado por subdomínios.
 */
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-fz_admin_session' : 'fz_admin_session';

/** Payload de um token íntegro, da versão atual e não revogado (sem checar a conta). */
export async function readValidPayload(
  token: string | undefined,
  config: AuthConfig = readAuthConfig(),
  now = Date.now(),
  store: SessionRevocationStore = revocationStore,
): Promise<AdminTokenPayload | null> {
  if (!isAuthReady(config)) return null;
  const payload = await verifyToken(token, config.secret!, now);
  if (!payload || payload.ver !== config.sessionVersion) return null;
  if (typeof payload.sid !== 'string' || (await store.isRevoked(payload.sid, Math.floor(now / 1000)))) return null;
  return payload;
}

/**
 * Valida o token e confirma que o administrador continua autorizado:
 * assinatura e role ADMIN, validade, versão das sessões, sessão não encerrada
 * no logout e conta ainda presente na configuração do servidor.
 * Usado pelo proxy e pela camada de acesso do servidor em TODA requisição.
 */
export async function resolveSession(
  token: string | undefined,
  config: AuthConfig = readAuthConfig(),
  now = Date.now(),
  store: SessionRevocationStore = revocationStore,
): Promise<AdminSessionInfo | null> {
  const payload = await readValidPayload(token, config, now, store);
  if (!payload) return null;
  const account = config.admins.find((a) => a.id === payload.sub);
  if (!account) return null;
  return {
    admin: toPublicAdmin(account),
    sessionId: payload.sid,
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

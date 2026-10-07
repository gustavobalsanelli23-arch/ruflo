import { isAuthReady, readAuthConfig, toPublicAdmin, type AuthConfig } from './config';
import { verifyToken } from './token';
import type { AdminSessionInfo } from './types';

export const SESSION_COOKIE = 'fz_admin_session';

/**
 * Valida o token e confirma que o administrador continua autorizado
 * (existe na configuração atual e a versão de sessão não mudou).
 * Usado pelo proxy e pela camada de acesso do servidor.
 */
export async function resolveSession(token: string | undefined, config: AuthConfig = readAuthConfig(), now = Date.now()): Promise<AdminSessionInfo | null> {
  if (!isAuthReady(config)) return null;
  const payload = await verifyToken(token, config.secret!, now);
  if (!payload || payload.ver !== config.sessionVersion) return null;
  const account = config.admins.find((a) => a.id === payload.sub);
  if (!account) return null;
  return {
    admin: toPublicAdmin(account),
    sessionId: payload.sid,
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

/**
 * Sessões administrativas encerradas (logout) antes de expirar.
 *
 * O token é assinado e não guarda estado; para que um token copiado deixe de
 * valer depois do "Sair", o id da sessão (`sid`) é registrado aqui até o
 * horário de expiração. Proxy, layout do painel e APIs consultam esta lista
 * a cada requisição (via `resolveSession`).
 *
 * LIMITAÇÃO: a implementação atual fica na memória do processo do servidor.
 * Funciona em um servidor único (`next start`), mas em hospedagem com várias
 * instâncias (ex.: Vercel) a revogação não é compartilhada entre elas. Ao
 * conectar um banco/Redis, implemente `SessionRevocationStore` com ele.
 * Enquanto isso, trocar FUTZONE_ADMIN_SESSION_VERSION encerra TODAS as
 * sessões em qualquer instância.
 */
export interface SessionRevocationStore {
  revoke(sessionId: string, expiresAtSec: number): Promise<void>;
  isRevoked(sessionId: string, nowSec?: number): Promise<boolean>;
}

export function createMemoryRevocationStore(): SessionRevocationStore {
  const revoked = new Map<string, number>();
  const prune = (nowSec: number) => {
    for (const [sid, exp] of revoked) if (exp <= nowSec) revoked.delete(sid);
  };
  return {
    async revoke(sessionId, expiresAtSec) {
      prune(Math.floor(Date.now() / 1000));
      revoked.set(sessionId, expiresAtSec);
    },
    async isRevoked(sessionId, nowSec = Math.floor(Date.now() / 1000)) {
      const exp = revoked.get(sessionId);
      if (exp === undefined) return false;
      if (exp <= nowSec) {
        revoked.delete(sessionId);
        return false;
      }
      return true;
    },
  };
}

// Uma única lista por processo, compartilhada entre o proxy e as rotas.
const KEY = Symbol.for('futzone.admin.revokedSessions');
const globalStore = globalThis as unknown as Record<symbol, SessionRevocationStore | undefined>;

export const revocationStore: SessionRevocationStore = (globalStore[KEY] ??= createMemoryRevocationStore());

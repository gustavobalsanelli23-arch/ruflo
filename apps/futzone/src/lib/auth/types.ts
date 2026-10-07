/** Única role com acesso ao painel. Clientes (futuros) nunca recebem esta role. */
export const ADMIN_ROLE = 'ADMIN' as const;
export type AdminRole = typeof ADMIN_ROLE;

/** Conteúdo assinado do token de sessão (nunca contém senha ou segredo). */
export interface AdminTokenPayload {
  /** Id estável do administrador (`admin-1` ou `admin-2`). */
  sub: string;
  role: AdminRole;
  /** Id aleatório desta sessão. */
  sid: string;
  /** Emitido em / expira em (segundos desde 1970). */
  iat: number;
  exp: number;
  /** Versão das sessões — trocar no servidor encerra todas as sessões ativas. */
  ver: string;
}

/** Dados do administrador que podem ir para o navegador. */
export interface PublicAdmin {
  id: string;
  name: string;
  email: string;
  initials: string;
}

export interface AdminSessionInfo {
  admin: PublicAdmin;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
}

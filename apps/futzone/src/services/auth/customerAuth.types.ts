/**
 * Contrato da autenticação de CLIENTES.
 *
 * Implementação atual: `LocalDemoAuthProvider` (modo demonstração — dados só
 * neste navegador, senha guardada como hash PBKDF2, nunca em texto puro).
 *
 * Implementação de produção (com banco de dados) deve:
 *   - rodar no servidor (rotas /api/auth/*), como o login do painel admin;
 *   - guardar apenas o hash da senha;
 *   - emitir sessão em cookie httpOnly + SameSite (nada de token no JS);
 *   - limitar tentativas e não revelar se um e-mail está cadastrado;
 *   - enviar e-mail de recuperação com token de uso único e expiração curta.
 * O restante do site usa só esta interface — nada muda nas telas.
 */

export interface CustomerSession {
  customerId: string;
  email: string;
  issuedAt: string;
  expiresAt: string;
  /** `demo` = sessão local de demonstração; `server` = sessão real (cookie httpOnly). */
  mode: 'demo' | 'server';
}

export interface RegisterCredentials {
  customerId: string;
  email: string;
  password: string;
}

export type AuthErrorCode =
  | 'email_em_uso'
  | 'credenciais_invalidas'
  | 'senha_atual_incorreta'
  | 'senha_fraca'
  | 'sessao_expirada'
  | 'indisponivel';

export type AuthResult<T = void> = { ok: true; value: T } | { ok: false; code: AuthErrorCode; message: string; field?: string };

export interface CustomerAuthProvider {
  readonly mode: 'demo' | 'server';
  getSession(): Promise<CustomerSession | null>;
  register(input: RegisterCredentials): Promise<AuthResult<CustomerSession>>;
  login(email: string, password: string): Promise<AuthResult<CustomerSession>>;
  logout(): Promise<void>;
  /** Sempre responde igual, exista ou não o e-mail (evita descobrir contas). */
  requestPasswordReset(email: string): Promise<void>;
  changePassword(customerId: string, currentPassword: string, newPassword: string): Promise<AuthResult>;
  changeEmail(customerId: string, newEmail: string): Promise<AuthResult>;
  /** Apenas no modo demonstração: entrar na conta de exemplo sem senha. */
  loginDemo?(customerId: string, email: string): Promise<CustomerSession>;
}

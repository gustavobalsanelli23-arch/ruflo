import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { normalizeEmail } from '@/lib/validation';
import { readJSON, removeKey, STORAGE_KEYS, writeJSON } from '@/services/storage';
import type { AuthResult, CustomerAuthProvider, CustomerSession, RegisterCredentials } from './customerAuth.types';

/**
 * Autenticação de clientes em MODO DEMONSTRAÇÃO.
 *
 * - Contas e sessão ficam somente neste navegador (não há servidor de clientes ainda).
 * - A senha nunca é guardada: só o hash PBKDF2-SHA256 com salt aleatório.
 * - Não protege dados de verdade — por isso a interface deixa claro que é demonstração.
 * Substitua por um provedor de servidor quando houver banco de dados.
 */

interface StoredCredential {
  customerId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

/** Menos iterações que o painel admin para não travar celulares (é só demonstração). */
const DEMO_ITERATIONS = 120_000;
const SESSION_DAYS = 7;

const readCredentials = () => readJSON<StoredCredential[]>(STORAGE_KEYS.authCredentials, []);
const writeCredentials = (list: StoredCredential[]) => writeJSON(STORAGE_KEYS.authCredentials, list);

function newSession(customerId: string, email: string): CustomerSession {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  return { customerId, email, issuedAt: now.toISOString(), expiresAt: expires.toISOString(), mode: 'demo' };
}

export class LocalDemoAuthProvider implements CustomerAuthProvider {
  readonly mode = 'demo' as const;

  async getSession(): Promise<CustomerSession | null> {
    const session = readJSON<CustomerSession | null>(STORAGE_KEYS.authSession, null);
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) {
      if (session) removeKey(STORAGE_KEYS.authSession);
      return null;
    }
    return session;
  }

  async register({ customerId, email, password }: RegisterCredentials): Promise<AuthResult<CustomerSession>> {
    const normalized = normalizeEmail(email);
    const list = readCredentials();
    if (list.some((c) => c.email === normalized)) {
      return { ok: false, code: 'email_em_uso', message: 'Este e-mail já tem uma conta. Faça login ou recupere a senha.', field: 'email' };
    }
    const now = new Date().toISOString();
    writeCredentials([...list, { customerId, email: normalized, passwordHash: await hashPassword(password, DEMO_ITERATIONS), createdAt: now, updatedAt: now }]);
    const session = newSession(customerId, normalized);
    writeJSON(STORAGE_KEYS.authSession, session);
    return { ok: true, value: session };
  }

  async login(email: string, password: string): Promise<AuthResult<CustomerSession>> {
    const normalized = normalizeEmail(email);
    const credential = readCredentials().find((c) => c.email === normalized);
    // Mesmo sem conta, faz a verificação para manter o tempo de resposta parecido.
    const valid = await verifyPassword(password, credential?.passwordHash ?? `pbkdf2-sha256:${DEMO_ITERATIONS}:AAAAAAAAAAAAAAAAAAAAAA:AAAA`);
    if (!credential || !valid) return { ok: false, code: 'credenciais_invalidas', message: 'E-mail ou senha incorretos.' };
    const session = newSession(credential.customerId, credential.email);
    writeJSON(STORAGE_KEYS.authSession, session);
    return { ok: true, value: session };
  }

  async loginDemo(customerId: string, email: string): Promise<CustomerSession> {
    const session = newSession(customerId, normalizeEmail(email));
    writeJSON(STORAGE_KEYS.authSession, session);
    return session;
  }

  async logout(): Promise<void> {
    removeKey(STORAGE_KEYS.authSession);
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Sem serviço de e-mail conectado: nada é enviado (o e-mail nem sai do
    // navegador). Em produção, o servidor gera um token de uso único com
    // validade curta e envia o link por e-mail — sem revelar se a conta existe.
    void email;
    await new Promise((r) => setTimeout(r, 600));
  }

  async changePassword(customerId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    const list = readCredentials();
    const credential = list.find((c) => c.customerId === customerId);
    if (!credential) return { ok: false, code: 'indisponivel', message: 'A conta de demonstração não tem senha definida.' };
    if (!(await verifyPassword(currentPassword, credential.passwordHash))) {
      return { ok: false, code: 'senha_atual_incorreta', message: 'Senha atual incorreta.', field: 'current' };
    }
    const passwordHash = await hashPassword(newPassword, DEMO_ITERATIONS);
    writeCredentials(list.map((c) => (c.customerId === customerId ? { ...c, passwordHash, updatedAt: new Date().toISOString() } : c)));
    return { ok: true, value: undefined };
  }

  async changeEmail(customerId: string, newEmail: string): Promise<AuthResult> {
    const normalized = normalizeEmail(newEmail);
    const list = readCredentials();
    if (list.some((c) => c.email === normalized && c.customerId !== customerId)) {
      return { ok: false, code: 'email_em_uso', message: 'Este e-mail já está em uso por outra conta.', field: 'email' };
    }
    writeCredentials(list.map((c) => (c.customerId === customerId ? { ...c, email: normalized, updatedAt: new Date().toISOString() } : c)));
    const session = await this.getSession();
    if (session?.customerId === customerId) writeJSON(STORAGE_KEYS.authSession, { ...session, email: normalized });
    return { ok: true, value: undefined };
  }

  /** Remove contas locais (usado ao restaurar os dados de exemplo). */
  clearAll(): void {
    removeKey(STORAGE_KEYS.authCredentials);
    removeKey(STORAGE_KEYS.authSession);
  }
}

export const customerAuthProvider = new LocalDemoAuthProvider();

import { isValidPasswordHash } from './password';
import type { PublicAdmin } from './types';

/**
 * Configuração dos administradores — lida SOMENTE no servidor, a partir de
 * variáveis de ambiente (Vercel → Settings → Environment Variables, ou
 * `.env.local` em desenvolvimento). Nada disto vai para o navegador.
 *
 * Exatamente dois slots, cada um com e-mail, nome e hash de senha próprios:
 *   FUTZONE_ADMIN_1_EMAIL / FUTZONE_ADMIN_1_NAME / FUTZONE_ADMIN_1_PASSWORD_HASH
 *   FUTZONE_ADMIN_2_EMAIL / FUTZONE_ADMIN_2_NAME / FUTZONE_ADMIN_2_PASSWORD_HASH
 *   FUTZONE_ADMIN_SESSION_SECRET   (mín. 32 caracteres aleatórios)
 *   FUTZONE_ADMIN_SESSION_VERSION  (opcional — trocar encerra todas as sessões)
 */

export const MAX_ADMINS = 2;

export interface AdminAccount extends PublicAdmin {
  passwordHash: string;
}

export interface AuthConfig {
  admins: AdminAccount[];
  secret: string | null;
  sessionVersion: string;
  /** Mensagens de configuração inválida (sem revelar valores). */
  problems: string[];
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('') || 'AD';

/** Situação de cada conta configurada (nunca inclui o hash). */
export type AdminSlotStatus = 'ok' | 'ausente' | 'email_invalido' | 'hash_invalido' | 'email_repetido';

export interface AdminSlotInfo {
  slot: number;
  name: string;
  email: string | null;
  status: AdminSlotStatus;
  /** Hash com tamanho fora do padrão (provavelmente colado pela metade): a senha nunca confere. */
  hashIncomplete?: boolean;
}

const SLOT_PROBLEM: Record<Exclude<AdminSlotStatus, 'ok' | 'ausente'>, string> = {
  email_invalido: 'e-mail ausente ou inválido.',
  hash_invalido: 'hash de senha ausente ou inválido.',
  email_repetido: 'e-mail repetido — cada administrador precisa de uma conta própria.',
};

/** Valor colado na Vercel com espaços ou aspas em volta continua valendo. */
const cleanEnv = (v: string | undefined) => v?.trim().replace(/^(["'])(.*)\1$/, '$2').trim();

function readSlots(env: Record<string, string | undefined>): Array<AdminSlotInfo & { hash?: string }> {
  const slots: Array<AdminSlotInfo & { hash?: string }> = [];
  const seen = new Set<string>();
  for (let slot = 1; slot <= MAX_ADMINS; slot++) {
    const email = cleanEnv(env[`FUTZONE_ADMIN_${slot}_EMAIL`])?.toLowerCase() || null;
    const hash = cleanEnv(env[`FUTZONE_ADMIN_${slot}_PASSWORD_HASH`]);
    const name = cleanEnv(env[`FUTZONE_ADMIN_${slot}_NAME`]) || `Admin ${slot}`;
    let status: AdminSlotStatus = 'ok';
    if (!email && !hash) status = 'ausente';
    else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) status = 'email_invalido';
    else if (!hash || !isValidPasswordHash(hash)) status = 'hash_invalido';
    else if (seen.has(email)) status = 'email_repetido';
    if (status === 'ok') seen.add(email!);
    slots.push({ slot, name, email, status, hash: status === 'ok' ? hash : undefined });
  }
  return slots;
}

/** Diagnóstico das contas para o painel: e-mail e situação de cada slot, sem o hash. */
export function describeAdminSlots(env: Record<string, string | undefined> = process.env): AdminSlotInfo[] {
  return readSlots(env).map(({ slot, name, email, status, hash }) => {
    // O gerador do painel e o script produzem salt de 16 bytes e hash de 32 (22 e 43 caracteres).
    const [, , salt = '', key = ''] = hash?.split(':') ?? [];
    const hashIncomplete = status === 'ok' && !(/^[A-Za-z0-9_-]{22}$/.test(salt) && /^[A-Za-z0-9_-]{43}$/.test(key));
    return { slot, name, email, status, ...(hashIncomplete ? { hashIncomplete } : {}) };
  });
}

export function readAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  const problems: string[] = [];
  const admins: AdminAccount[] = [];

  for (const s of readSlots(env)) {
    if (s.status === 'ausente') continue;
    if (s.status !== 'ok') {
      problems.push(`Administrador ${s.slot}: ${SLOT_PROBLEM[s.status]}`);
      continue;
    }
    admins.push({ id: `admin-${s.slot}`, email: s.email!, name: s.name, initials: initialsOf(s.name), passwordHash: s.hash! });
  }

  const rawSecret = cleanEnv(env.FUTZONE_ADMIN_SESSION_SECRET);
  let secret: string | null = null;
  if (!rawSecret) {
    if (admins.length) problems.push('FUTZONE_ADMIN_SESSION_SECRET não configurado.');
  } else if (rawSecret.length < 32) {
    problems.push('FUTZONE_ADMIN_SESSION_SECRET precisa ter pelo menos 32 caracteres.');
  } else {
    secret = rawSecret;
  }

  return { admins, secret, sessionVersion: env.FUTZONE_ADMIN_SESSION_VERSION?.trim() || '1', problems };
}

/** O login só fica disponível com pelo menos um administrador válido e um segredo. */
export const isAuthReady = (config: AuthConfig) => config.admins.length > 0 && config.secret !== null;

export const toPublicAdmin = ({ id, name, email, initials }: AdminAccount): PublicAdmin => ({ id, name, email, initials });

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

export function readAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  const problems: string[] = [];
  const admins: AdminAccount[] = [];

  for (let slot = 1; slot <= MAX_ADMINS; slot++) {
    const email = env[`FUTZONE_ADMIN_${slot}_EMAIL`]?.trim().toLowerCase();
    const hash = env[`FUTZONE_ADMIN_${slot}_PASSWORD_HASH`]?.trim();
    const name = env[`FUTZONE_ADMIN_${slot}_NAME`]?.trim() || `Admin ${slot}`;
    if (!email && !hash) continue;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      problems.push(`Administrador ${slot}: e-mail ausente ou inválido.`);
      continue;
    }
    if (!hash || !isValidPasswordHash(hash)) {
      problems.push(`Administrador ${slot}: hash de senha ausente ou inválido.`);
      continue;
    }
    if (admins.some((a) => a.email === email)) {
      problems.push(`Administrador ${slot}: e-mail repetido — cada administrador precisa de uma conta própria.`);
      continue;
    }
    admins.push({ id: `admin-${slot}`, email, name, initials: initialsOf(name), passwordHash: hash });
  }

  const rawSecret = env.FUTZONE_ADMIN_SESSION_SECRET?.trim();
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

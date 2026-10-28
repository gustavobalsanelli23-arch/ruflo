/**
 * Translates Supabase Auth and database errors into messages people can act
 * on. Messages never confirm whether an e-mail has an account.
 */

export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'validation'
  | 'rate_limited'
  | 'not_found'
  | 'conflict'
  | 'unavailable'
  | 'unknown';

export interface MappedError {
  code: ErrorCode;
  message: string;
}

export const GENERIC_ERROR = 'Não foi possível concluir agora. Tente de novo em instantes.';
export const SESSION_EXPIRED = 'Sua sessão expirou. Entre novamente para continuar.';
export const RATE_LIMITED = 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.';

const AUTH_MESSAGES: Record<string, MappedError> = {
  invalid_credentials: { code: 'validation', message: 'E-mail ou senha incorretos.' },
  weak_password: { code: 'validation', message: 'Senha fraca. Use pelo menos 8 caracteres, com letras e números, e evite senhas conhecidas.' },
  same_password: { code: 'validation', message: 'A nova senha precisa ser diferente da atual.' },
  email_address_invalid: { code: 'validation', message: 'Informe um e-mail válido.' },
  over_email_send_rate_limit: { code: 'rate_limited', message: RATE_LIMITED },
  over_request_rate_limit: { code: 'rate_limited', message: RATE_LIMITED },
  otp_expired: { code: 'validation', message: 'Este link expirou ou já foi usado. Peça um novo.' },
  flow_state_expired: { code: 'validation', message: 'Este link expirou ou já foi usado. Peça um novo.' },
  flow_state_not_found: { code: 'validation', message: 'Este link expirou ou já foi usado. Peça um novo.' },
  bad_code_verifier: { code: 'validation', message: 'Abra o link no mesmo navegador em que você fez o pedido, ou peça um novo.' },
  session_not_found: { code: 'unauthenticated', message: SESSION_EXPIRED },
  session_expired: { code: 'unauthenticated', message: SESSION_EXPIRED },
  refresh_token_not_found: { code: 'unauthenticated', message: SESSION_EXPIRED },
  signup_disabled: { code: 'forbidden', message: 'Novos cadastros estão desativados no momento.' },
  reauthentication_needed: { code: 'unauthenticated', message: 'Por segurança, entre novamente antes de trocar a senha.' },
};

export function mapAuthError(error: { code?: string; status?: number } | null | undefined): MappedError {
  if (error?.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code]!;
  if (error?.status === 429) return { code: 'rate_limited', message: RATE_LIMITED };
  return { code: 'unknown', message: GENERIC_ERROR };
}

const DB_MESSAGES: Record<string, MappedError> = {
  not_authenticated: { code: 'unauthenticated', message: SESSION_EXPIRED },
  forbidden: { code: 'forbidden', message: 'Você não tem permissão para esta ação nesta organização.' },
  role_requires_owner: { code: 'forbidden', message: 'Somente um proprietário pode convidar ou alterar administradores e proprietários.' },
  last_owner: { code: 'conflict', message: 'A organização precisa de pelo menos um proprietário. Torne outra pessoa proprietária antes.' },
  membership_immutable: { code: 'forbidden', message: 'Este vínculo não pode ser movido para outra pessoa ou organização.' },
  invalid_name: { code: 'validation', message: 'O nome deve ter entre 2 e 80 caracteres.' },
  invalid_email: { code: 'validation', message: 'Informe um e-mail válido, como nome@empresa.com.br.' },
  invalid_role: { code: 'validation', message: 'Escolha um papel válido para o convite.' },
  already_member: { code: 'conflict', message: 'Esta pessoa já faz parte da organização.' },
  rate_limited: { code: 'rate_limited', message: RATE_LIMITED },
  invitation_not_found: { code: 'not_found', message: 'Convite não encontrado. Peça um novo link a quem convidou você.' },
  invitation_used: { code: 'conflict', message: 'Este convite já foi usado.' },
  invitation_expired: { code: 'conflict', message: 'Este convite expirou. Peça um novo link a quem convidou você.' },
  invitation_email_mismatch: {
    code: 'forbidden',
    message: 'Este convite foi enviado para outro e-mail. Entre com a conta do e-mail convidado.',
  },
  email_not_confirmed: { code: 'forbidden', message: 'Confirme seu e-mail antes de aceitar o convite.' },
  profile_missing: { code: 'unknown', message: GENERIC_ERROR },
};

/** Database (PostgREST) errors: `solus:<code>` from our functions, SQLSTATE otherwise. */
export function mapDatabaseError(error: { code?: string; message?: string } | null | undefined): MappedError {
  const reason = error?.message?.startsWith('solus:') ? error.message.slice('solus:'.length) : null;
  if (reason && DB_MESSAGES[reason]) return DB_MESSAGES[reason]!;
  if (error?.code === '42501') return DB_MESSAGES.forbidden!;
  if (error?.code === 'PGRST301' || error?.code === 'PGRST303') return { code: 'unauthenticated', message: SESSION_EXPIRED };
  return { code: 'unknown', message: GENERIC_ERROR };
}

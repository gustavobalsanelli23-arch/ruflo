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
  // Importações
  import_not_found: { code: 'not_found', message: 'Importação não encontrada nesta organização.' },
  invalid_import_state: { code: 'conflict', message: 'Esta importação mudou de etapa (talvez em outra aba). Atualize a página para ver a situação atual.' },
  invalid_file_name: { code: 'validation', message: 'Nome de arquivo inválido.' },
  invalid_dataset: { code: 'validation', message: 'Escolha o tipo de dado do arquivo.' },
  unsupported_format: { code: 'validation', message: 'Formato não aceito. Envie uma planilha .xlsx ou um arquivo .csv.' },
  empty_file: { code: 'validation', message: 'O arquivo está vazio.' },
  file_too_large: { code: 'validation', message: 'O arquivo passa de 25 MB. Divida por período.' },
  invalid_checksum: { code: 'validation', message: 'Não foi possível conferir o arquivo. Selecione-o de novo.' },
  upload_missing: { code: 'conflict', message: 'O arquivo não chegou ao armazenamento. Envie de novo.' },
  upload_mismatch: { code: 'conflict', message: 'O arquivo armazenado não confere com o selecionado. Envie de novo.' },
  invalid_mapping: { code: 'validation', message: 'Mapeamento de colunas inválido. Revise as colunas escolhidas.' },
  invalid_batch: { code: 'validation', message: 'Um lote de linhas foi recusado pelo banco. Recomece a validação.' },
  batch_too_large: { code: 'validation', message: 'Lote grande demais. Recomece a validação.' },
  batch_conflict: { code: 'conflict', message: 'Este lote já foi recebido com outro conteúdo. Recomece a validação.' },
  batches_missing: { code: 'conflict', message: 'Nem todas as linhas chegaram ao servidor. Recomece a validação.' },
  batches_pending: { code: 'conflict', message: 'Ainda há lotes a gravar. Continue a importação.' },
  invalid_duplicate_policy: { code: 'validation', message: 'Escolha o que fazer com as linhas duplicadas.' },
  import_in_progress: {
    code: 'conflict',
    message: 'Outra importação desta organização está sendo gravada. Conclua ou cancele essa antes de começar outra.',
  },
  import_not_revertable: { code: 'validation', message: 'Cadastros não são desfeitos: importe o arquivo corrigido para atualizar os dados.' },
  invalid_settings: { code: 'validation', message: 'Valores fora da faixa permitida. Revise os parâmetros.' },
  // Oportunidades
  opportunity_not_found: { code: 'not_found', message: 'Oportunidade não encontrada nesta organização.' },
  invalid_status: { code: 'validation', message: 'Escolha um status válido.' },
  invalid_note: { code: 'validation', message: 'A observação pode ter até 500 caracteres.' },
  invalid_opportunities: { code: 'unknown', message: GENERIC_ERROR },
  ai_daily_limit: { code: 'rate_limited', message: 'A organização chegou ao limite diário de perguntas ao analista. O limite volta amanhã.' },
  invalid_ai_request: { code: 'validation', message: 'Pedido inválido ao analista.' },
  ai_request_not_found: { code: 'not_found', message: GENERIC_ERROR },
};

/** Database (PostgREST) errors: `solus:<code>` from our functions, SQLSTATE otherwise. */
export function mapDatabaseError(error: { code?: string; message?: string } | null | undefined): MappedError {
  const reason = error?.message?.startsWith('solus:') ? error.message.slice('solus:'.length) : null;
  if (reason && DB_MESSAGES[reason]) return DB_MESSAGES[reason]!;
  if (error?.code === '42501') return DB_MESSAGES.forbidden!;
  if (error?.code === 'PGRST301' || error?.code === 'PGRST303') return { code: 'unauthenticated', message: SESSION_EXPIRED };
  return { code: 'unknown', message: GENERIC_ERROR };
}

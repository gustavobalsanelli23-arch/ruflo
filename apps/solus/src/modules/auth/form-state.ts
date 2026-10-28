import type { ErrorCode } from '@/lib/supabase/errors';

/**
 * What a form Server Action returns. Only non-secret inputs are echoed back
 * in `values` (never passwords).
 */
export interface FormState {
  status: 'idle' | 'error' | 'success' | 'unconfirmed';
  message?: string;
  code?: ErrorCode;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  /** Address an e-mail was sent to, for confirmation screens. */
  email?: string;
  /** One-time data for the success state (e.g. an invitation link). */
  payload?: Record<string, string>;
}

export const IDLE: FormState = { status: 'idle' };

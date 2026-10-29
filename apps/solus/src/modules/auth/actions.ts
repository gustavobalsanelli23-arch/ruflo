'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loginPath, safeNextPath } from '@/lib/auth/redirect';
import { getSiteUrl } from '@/lib/env';
import { logServerError } from '@/lib/log';
import { GENERIC_ERROR, mapAuthError, RATE_LIMITED } from '@/lib/supabase/errors';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  changePasswordSchema,
  emailOnlySchema,
  fieldErrors,
  otpTypeSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/schemas/auth';
import { clientIp, consumeRateLimits, fingerprint, type RateRule } from '@/services/rate-limit';
import { hasRecoveryGrant, RECOVERY_COOKIE, RECOVERY_WINDOW_SECONDS } from '@/services/recovery';
import { getSessionUser } from '@/services/session';
import { ACTIVE_ORG_COOKIE } from '@/services/workspace';
import type { FormState } from './form-state';

/**
 * Authentication Server Actions. Next.js only accepts them as POST requests
 * from the same origin (built-in CSRF protection). Each one validates its own
 * input with Zod, applies a shared rate limit and answers with messages that
 * never reveal whether an e-mail has an account.
 */

const NOT_CONFIGURED = 'A autenticação ainda não foi configurada neste ambiente.';
const UNAVAILABLE = 'O serviço de acesso está indisponível no momento. Tente de novo em instantes.';

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

async function limit(rules: RateRule[]): Promise<FormState | null> {
  const verdict = await consumeRateLimits(rules);
  if (verdict === 'limited') return { status: 'error', code: 'rate_limited', message: RATE_LIMITED };
  if (verdict === 'unavailable') return { status: 'error', code: 'unavailable', message: UNAVAILABLE };
  return null;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/* ---------- Sign in ---------- */

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, 'email').slice(0, 254) };
  const parsed = signInSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: 'error', code: 'unavailable', message: NOT_CONFIGURED, values };

  const ip = await clientIp();
  const blocked = await limit([
    { bucket: `signin:ip:${ip}`, limit: 30, windowSeconds: 15 * MINUTE },
    { bucket: `signin:email:${fingerprint(parsed.data.email)}`, limit: 10, windowSeconds: 15 * MINUTE },
  ]);
  if (blocked) return { ...blocked, values };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === 'email_not_confirmed') return { status: 'unconfirmed', email: parsed.data.email, values };
    const mapped = mapAuthError(error);
    if (mapped.code === 'unknown') logServerError('auth: entrar', error);
    return { status: 'error', code: mapped.code, message: mapped.message, values };
  }
  redirect(safeNextPath(formData.get('next')));
}

/* ---------- Sign up ---------- */

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = { fullName: text(formData, 'fullName').slice(0, 120), email: text(formData, 'email').slice(0, 254) };
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: 'error', code: 'unavailable', message: NOT_CONFIGURED, values };

  const ip = await clientIp();
  const blocked = await limit([
    { bucket: `signup:ip:${ip}`, limit: 10, windowSeconds: HOUR },
    { bucket: `signup:email:${fingerprint(parsed.data.email)}`, limit: 3, windowSeconds: HOUR },
  ]);
  if (blocked) return { ...blocked, values };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      data: { full_name: parsed.data.fullName },
    },
  });
  if (error) {
    const mapped = mapAuthError(error);
    if (error.code === 'weak_password') return { status: 'error', fieldErrors: { password: mapped.message }, values };
    if (mapped.code === 'unknown') logServerError('auth: cadastro', error);
    return { status: 'error', code: mapped.code, message: mapped.message, values };
  }
  // Without e-mail confirmation (not recommended) Supabase signs in at once.
  if (data.session) redirect('/organizacoes/nova');
  // Same answer whether or not the e-mail already had an account.
  return { status: 'success', email: parsed.data.email };
}

/* ---------- Resend confirmation ---------- */

export async function resendConfirmationAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { status: 'error', message: 'Informe um e-mail válido.' };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: 'error', code: 'unavailable', message: NOT_CONFIGURED };

  const ip = await clientIp();
  const blocked = await limit([
    { bucket: `resend:ip:${ip}`, limit: 10, windowSeconds: HOUR },
    { bucket: `resend:email:${fingerprint(parsed.data.email)}`, limit: 3, windowSeconds: HOUR },
  ]);
  if (blocked) return { ...blocked, email: parsed.data.email };

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm` },
  });
  if (error) {
    const mapped = mapAuthError(error);
    if (mapped.code === 'rate_limited') return { status: 'error', code: 'rate_limited', message: mapped.message, email: parsed.data.email };
    if (mapped.code === 'unknown') logServerError('auth: reenviar confirmação', error);
  }
  return { status: 'success', email: parsed.data.email, message: 'Se houver um cadastro pendente para este e-mail, um novo link foi enviado.' };
}

/* ---------- Password recovery ---------- */

export async function requestPasswordResetAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, 'email').slice(0, 254) };
  const parsed = emailOnlySchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: 'error', code: 'unavailable', message: NOT_CONFIGURED, values };

  const ip = await clientIp();
  const blocked = await limit([
    { bucket: `recover:ip:${ip}`, limit: 10, windowSeconds: HOUR },
    { bucket: `recover:email:${fingerprint(parsed.data.email)}`, limit: 3, windowSeconds: HOUR },
  ]);
  if (blocked) return { ...blocked, values };

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?fluxo=recuperacao`,
  });
  if (error) {
    const mapped = mapAuthError(error);
    if (mapped.code === 'rate_limited') return { status: 'error', code: 'rate_limited', message: mapped.message, values };
    if (mapped.code === 'unknown') logServerError('auth: recuperar senha', error);
  }
  // Same answer whether or not the address has an account.
  return { status: 'success', email: parsed.data.email };
}

/* ---------- E-mail links (confirmation, recovery) ---------- */

export async function confirmEmailLinkAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: 'error', code: 'unavailable', message: NOT_CONFIGURED };

  const tokenHash = text(formData, 'token_hash');
  const type = otpTypeSchema.safeParse(formData.get('type'));
  const code = text(formData, 'code');
  const isRecovery = (type.success && type.data === 'recovery') || text(formData, 'fluxo') === 'recuperacao';

  let error: { code?: string; status?: number } | null = null;
  let userId: string | undefined;
  if (tokenHash && type.success && /^[A-Za-z0-9_-]{8,256}$/.test(tokenHash)) {
    const result = await supabase.auth.verifyOtp({ type: type.data, token_hash: tokenHash });
    error = result.error;
    userId = result.data.user?.id;
  } else if (code && /^[A-Za-z0-9_-]{8,256}$/.test(code)) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
    userId = result.data.user?.id;
  } else {
    return { status: 'error', message: 'Link incompleto. Abra o link mais recente enviado para o seu e-mail.' };
  }

  if (error) {
    const mapped = mapAuthError(error);
    if (mapped.code === 'unknown') logServerError('auth: confirmar link', error);
    return {
      status: 'error',
      code: mapped.code,
      message: mapped.code === 'unknown' ? 'Este link expirou ou já foi usado. Peça um novo.' : mapped.message,
    };
  }

  if (isRecovery && userId) {
    (await cookies()).set(RECOVERY_COOKIE, userId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: RECOVERY_WINDOW_SECONDS,
    });
    redirect('/redefinir-senha');
  }
  redirect('/visao-geral');
}

/* ---------- Set a new password (after the recovery link) ---------- */

export async function resetPasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get('password'), confirmation: formData.get('confirmation') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  if (!supabase || !user) redirect('/recuperar-senha?motivo=link-expirado');
  if (!(await hasRecoveryGrant(user.id))) {
    return { status: 'error', message: 'Abra de novo o link de recuperação enviado para o seu e-mail.' };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const mapped = mapAuthError(error);
    if (error.code === 'weak_password' || error.code === 'same_password') {
      return { status: 'error', fieldErrors: { password: mapped.message } };
    }
    if (mapped.code === 'unknown') logServerError('auth: redefinir senha', error);
    return { status: 'error', code: mapped.code, message: mapped.message };
  }

  const store = await cookies();
  store.delete(RECOVERY_COOKIE);
  store.delete(ACTIVE_ORG_COOKIE);
  // Every session, on every device, ends: the new password is required.
  await supabase.auth.signOut({ scope: 'global' });
  redirect(loginPath({ reason: 'senha-redefinida' }));
}

/* ---------- Change password (signed in, knows the current one) ---------- */

export async function changePasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    password: formData.get('password'),
    confirmation: formData.get('confirmation'),
  });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  if (!supabase || !user) return { status: 'error', code: 'unauthenticated', message: 'Sua sessão expirou. Entre novamente.' };

  const blocked = await limit([{ bucket: `password-change:${user.id}`, limit: 5, windowSeconds: 15 * MINUTE }]);
  if (blocked) return blocked;

  const check = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
  if (check.error) {
    return { status: 'error', fieldErrors: { currentPassword: 'Senha atual incorreta.' } };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const mapped = mapAuthError(error);
    if (error.code === 'weak_password' || error.code === 'same_password') return { status: 'error', fieldErrors: { password: mapped.message } };
    if (mapped.code === 'unknown') logServerError('auth: trocar senha', error);
    return { status: 'error', code: mapped.code, message: mapped.message };
  }
  await supabase.auth.signOut({ scope: 'others' });
  return { status: 'success', message: 'Senha alterada. As sessões em outros dispositivos foram encerradas.' };
}

/* ---------- Sessions ---------- */

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) logServerError('auth: sair', error);
  }
  const store = await cookies();
  store.delete(ACTIVE_ORG_COOKIE);
  store.delete(RECOVERY_COOKIE);
  redirect(loginPath({ reason: 'saiu' }));
}

export async function signOutOtherSessionsAction(): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  const user = await getSessionUser();
  if (!supabase || !user) return { status: 'error', code: 'unauthenticated', message: 'Sua sessão expirou. Entre novamente.' };
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) {
    logServerError('auth: encerrar outras sessões', error);
    return { status: 'error', message: GENERIC_ERROR };
  }
  return { status: 'success', message: 'Sessões em outros dispositivos encerradas.' };
}

/** Lightweight check used when a tab regains focus. */
export async function sessionStatusAction(): Promise<{ active: boolean }> {
  return { active: (await getSessionUser()) !== null };
}

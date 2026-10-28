import { z } from 'zod';

/**
 * Validation for authentication forms. The same schemas run in the browser
 * (instant feedback) and in the Server Actions (the check that counts).
 */

export const PASSWORD_MIN = 8;
/** bcrypt, used by Supabase Auth, ignores bytes past 72. */
export const PASSWORD_MAX = 72;

export const emailSchema = z
  .string({ error: 'Informe seu e-mail.' })
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu e-mail.')
  .max(254, 'E-mail longo demais.')
  .pipe(z.email('Informe um e-mail válido, como nome@empresa.com.br.'));

export const newPasswordSchema = z
  .string({ error: 'Crie uma senha.' })
  .min(PASSWORD_MIN, `Use pelo menos ${PASSWORD_MIN} caracteres.`)
  .max(PASSWORD_MAX, `Use no máximo ${PASSWORD_MAX} caracteres.`)
  .refine((value) => /[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value), 'Combine letras e números.');

export const fullNameSchema = z
  .string({ error: 'Informe seu nome.' })
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().min(2, 'Informe seu nome.').max(120, 'Nome longo demais.'));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Informe sua senha.' }).min(1, 'Informe sua senha.').max(PASSWORD_MAX, 'Senha inválida.'),
});

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmation: z.string({ error: 'Repita a senha.' }),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'As senhas não coincidem.',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'Informe a senha atual.' }).min(1, 'Informe a senha atual.').max(PASSWORD_MAX),
    password: newPasswordSchema,
    confirmation: z.string({ error: 'Repita a nova senha.' }),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'As senhas não coincidem.',
  });

/** Supabase e-mail link types handled by /auth/confirm. */
export const otpTypeSchema = z.enum(['signup', 'email', 'recovery', 'invite', 'email_change']);

/** First message per field, ready for aria-describedby. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

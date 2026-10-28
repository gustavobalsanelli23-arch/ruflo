'use client';

import { KeyRound, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { Notice } from '@/components/data/states';
import { emailOnlySchema, PASSWORD_MIN, resetPasswordSchema } from '@/schemas/auth';
import { requestPasswordResetAction, resetPasswordAction } from './actions';
import { AuthHeading, Field, PasswordInput, SubmitButton, TextInput, useValidatedAction } from './form-kit';
import { IDLE } from './form-state';

const linkClass = 'font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline';

export function RequestResetForm({ enabled }: { enabled: boolean }) {
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(emailOnlySchema, requestPasswordResetAction, IDLE);

  if (state.status === 'success' && state.email) {
    return (
      <div>
        <MailCheck aria-hidden="true" className="mb-5 size-7 text-brand" strokeWidth={1.5} />
        <AuthHeading
          title="Confira seu e-mail"
          description={
            <>
              Se houver uma conta para <strong className="font-medium text-foreground">{state.email}</strong>, você vai receber um link para
              criar uma nova senha. Ele vale por 1 hora e funciona uma única vez.
            </>
          }
        />
        <p className="text-sm text-muted-foreground">
          Lembrou a senha?{' '}
          <Link href="/entrar" className={linkClass}>
            Entrar
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title="Recuperar acesso" description="Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha." />
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {state.status === 'error' && state.message && (
          <Notice tone="error" title="Não foi possível enviar o link">
            {state.message}
          </Notice>
        )}
        <fieldset disabled={!enabled} className="contents">
          <Field name="email" label="E-mail" error={errors.email}>
            <TextInput
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              defaultValue={state.values?.email}
              error={errors.email}
              onClear={clearError}
              placeholder="nome@empresa.com.br"
            />
          </Field>
          <SubmitButton pending={pending} pendingLabel="Enviando…">
            Enviar link
          </SubmitButton>
        </fieldset>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/entrar" className={linkClass}>
          Voltar para entrar
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm({ email }: { email: string }) {
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(resetPasswordSchema, resetPasswordAction, IDLE);
  const hint = `Pelo menos ${PASSWORD_MIN} caracteres, combinando letras e números.`;
  return (
    <div>
      <KeyRound aria-hidden="true" className="mb-5 size-7 text-brand" strokeWidth={1.5} />
      <AuthHeading
        title="Criar nova senha"
        description={
          <>
            Para a conta <strong className="font-medium text-foreground">{email}</strong>. Depois de salvar, todas as sessões são encerradas e você
            entra de novo com a nova senha.
          </>
        }
      />
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {state.status === 'error' && state.message && (
          <Notice tone="error" title="Não foi possível salvar">
            {state.message}
          </Notice>
        )}
        <Field name="password" label="Nova senha" error={errors.password} hint={hint}>
          <PasswordInput name="password" autoComplete="new-password" error={errors.password} hint={hint} onClear={clearError} />
        </Field>
        <Field name="confirmation" label="Repita a nova senha" error={errors.confirmation}>
          <PasswordInput name="confirmation" autoComplete="new-password" error={errors.confirmation} onClear={clearError} />
        </Field>
        <SubmitButton pending={pending} pendingLabel="Salvando…">
          Salvar nova senha
        </SubmitButton>
      </form>
    </div>
  );
}

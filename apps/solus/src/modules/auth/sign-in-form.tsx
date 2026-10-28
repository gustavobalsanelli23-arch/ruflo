'use client';

import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { Notice } from '@/components/data/states';
import { signInSchema } from '@/schemas/auth';
import { signInAction } from './actions';
import { AuthHeading, Field, PasswordInput, SubmitButton, TextInput, useValidatedAction } from './form-kit';
import { IDLE } from './form-state';
import { ResendConfirmation } from './resend-confirmation';

export function SignInForm({ next, enabled }: { next?: string; enabled: boolean }) {
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(signInSchema, signInAction, IDLE);
  const query = next ? `?next=${encodeURIComponent(next)}` : '';

  if (state.status === 'unconfirmed' && state.email) {
    return (
      <div>
        <MailCheck aria-hidden="true" className="mb-5 size-7 text-brand" strokeWidth={1.5} />
        <AuthHeading
          title="Confirme seu e-mail"
          description={
            <>
              A conta <strong className="font-medium text-foreground">{state.email}</strong> ainda não foi confirmada. Abra o link que enviamos
              no cadastro, ou peça outro.
            </>
          }
        />
        <ResendConfirmation email={state.email} />
        <p className="mt-6 text-sm text-muted-foreground">
          Já confirmou?{' '}
          <Link href={`/entrar${query}`} className="font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline">
            Entrar de novo
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title="Entrar" description="Acesse os dados da sua empresa." />
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {next && <input type="hidden" name="next" value={next} />}
        {state.status === 'error' && state.message && (
          <Notice tone="error" title="Não foi possível entrar">
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
          <Field
            name="password"
            label="Senha"
            error={errors.password}
            aside={
              <Link
                href="/recuperar-senha"
                className="text-xs font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline"
              >
                Esqueceu a senha?
              </Link>
            }
          >
            <PasswordInput name="password" autoComplete="current-password" error={errors.password} onClear={clearError} />
          </Field>
          <SubmitButton pending={pending} pendingLabel="Entrando…">
            Entrar
          </SubmitButton>
        </fieldset>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Ainda não tem conta?{' '}
        <Link href={`/cadastro${query}`} className="font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

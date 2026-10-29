'use client';

import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Notice } from '@/components/data/states';
import { PASSWORD_MIN, signUpSchema } from '@/schemas/auth';
import { signUpAction } from './actions';
import { AuthHeading, Field, PasswordInput, SubmitButton, TextInput, useValidatedAction } from './form-kit';
import { IDLE } from './form-state';
import { ResendConfirmation } from './resend-confirmation';

export function SignUpForm({ next, enabled }: { next?: string; enabled: boolean }) {
  const [attempt, setAttempt] = useState(0);
  return <SignUpAttempt key={attempt} next={next} enabled={enabled} onRestart={() => setAttempt((n) => n + 1)} />;
}

function SignUpAttempt({ next, enabled, onRestart }: { next?: string; enabled: boolean; onRestart: () => void }) {
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(signUpSchema, signUpAction, IDLE);
  const query = next ? `?next=${encodeURIComponent(next)}` : '';

  if (state.status === 'success' && state.email) {
    return (
      <div>
        <MailCheck aria-hidden="true" className="mb-5 size-7 text-brand" strokeWidth={1.5} />
        <AuthHeading
          title="Confirme seu e-mail"
          description={
            <>
              Enviamos um link para <strong className="font-medium text-foreground">{state.email}</strong>. Abra o e-mail e toque em
              Confirmar e-mail para ativar a conta.
            </>
          }
        />
        <ul className="mb-6 flex flex-col gap-2 text-sm text-muted-foreground">
          <li>Não chegou? Confira a caixa de spam ou promoções.</li>
          <li>Se este e-mail já tiver uma conta, entre com ela ou recupere a senha.</li>
        </ul>
        <ResendConfirmation email={state.email} />
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <button type="button" onClick={onRestart} className="font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline">
            Usar outro e-mail
          </button>
          <Link href={`/entrar${query}`} className="font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline">
            Ir para entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title="Criar conta" description="Depois de confirmar o e-mail, você cria a organização da sua empresa." />
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {state.status === 'error' && state.message && (
          <Notice tone="error" title="Não foi possível criar a conta">
            {state.message}
          </Notice>
        )}
        <fieldset disabled={!enabled} className="contents">
          <Field name="fullName" label="Nome" error={errors.fullName}>
            <TextInput name="fullName" autoComplete="name" defaultValue={state.values?.fullName} error={errors.fullName} onClear={clearError} />
          </Field>
          <Field name="email" label="E-mail de trabalho" error={errors.email}>
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
            hint={`Pelo menos ${PASSWORD_MIN} caracteres, combinando letras e números.`}
          >
            <PasswordInput
              name="password"
              autoComplete="new-password"
              error={errors.password}
              hint={`Pelo menos ${PASSWORD_MIN} caracteres, combinando letras e números.`}
              onClear={clearError}
            />
          </Field>
          <SubmitButton pending={pending} pendingLabel="Criando conta…">
            Criar conta
          </SubmitButton>
        </fieldset>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Já tem conta?{' '}
        <Link href={`/entrar${query}`} className="font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

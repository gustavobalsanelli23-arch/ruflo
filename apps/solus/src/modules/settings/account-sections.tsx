'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { Notice } from '@/components/data/states';
import { redirectIfSignedOut } from '@/components/shell/session-watch';
import { Input } from '@/components/ui/input';
import { changePasswordAction, signOutOtherSessionsAction } from '@/modules/auth/actions';
import { PasswordInput, SubmitButton, TextInput, useValidatedAction } from '@/modules/auth/form-kit';
import { IDLE, type FormState } from '@/modules/auth/form-state';
import { updateProfileAction } from '@/modules/organizations/actions';
import { changePasswordSchema, PASSWORD_MIN } from '@/schemas/auth';
import { updateProfileSchema } from '@/schemas/organization';
import { SettingsField } from './settings-frame';

function useResultToast(state: FormState) {
  useEffect(() => {
    if (redirectIfSignedOut(state)) return;
    if (state.status === 'success' && state.message) toast.success(state.message);
  }, [state]);
}

export function ProfileSection({ fullName, email }: { fullName: string | null; email: string }) {
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(updateProfileSchema, updateProfileAction, IDLE);
  useResultToast(state);
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {state.status === 'error' && state.message && (
        <Notice tone="error" title="Não foi possível salvar">
          {state.message}
        </Notice>
      )}
      <SettingsField id="fullName" label="Nome" hint="Como você aparece para a equipe." error={errors.fullName}>
        <TextInput
          name="fullName"
          autoComplete="name"
          defaultValue={fullName ?? ''}
          maxLength={120}
          error={errors.fullName}
          onClear={clearError}
          className="h-9"
        />
      </SettingsField>
      <SettingsField id="email" label="E-mail" hint="Usado para entrar. A troca de e-mail ainda não está disponível.">
        <Input id="email" type="email" value={email} readOnly className="h-9 bg-muted/50 px-3" />
      </SettingsField>
      <div className="flex justify-end border-t pt-5">
        <SubmitButton pending={pending} pendingLabel="Salvando…" className="w-auto px-4">
          Salvar perfil
        </SubmitButton>
      </div>
    </form>
  );
}

export function SecuritySection() {
  const {
    state: passwordState,
    formAction: passwordAction,
    pending: passwordPending,
    errors,
    onSubmit,
    clearError,
    formRef,
  } = useValidatedAction(changePasswordSchema, changePasswordAction, IDLE);
  const [sessions, sessionsAction, sessionsPending] = useActionState(signOutOtherSessionsAction, IDLE);
  useResultToast(passwordState);
  useResultToast(sessions);
  const hint = `Pelo menos ${PASSWORD_MIN} caracteres, combinando letras e números.`;

  return (
    <div className="flex flex-col gap-8">
      <form ref={formRef} action={passwordAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <h3 className="text-sm font-semibold text-foreground">Alterar senha</h3>
        {passwordState.status === 'error' && passwordState.message && (
          <Notice tone="error" title="Não foi possível alterar a senha">
            {passwordState.message}
          </Notice>
        )}
        <SettingsField id="currentPassword" label="Senha atual" error={errors.currentPassword}>
          <PasswordInput
            name="currentPassword"
            autoComplete="current-password"
            error={errors.currentPassword}
            onClear={clearError}
            className="h-9"
          />
        </SettingsField>
        <SettingsField id="password" label="Nova senha" hint={hint} error={errors.password}>
          <PasswordInput name="password" autoComplete="new-password" error={errors.password} hint={hint} onClear={clearError} className="h-9" />
        </SettingsField>
        <SettingsField id="confirmation" label="Repita a nova senha" error={errors.confirmation}>
          <PasswordInput name="confirmation" autoComplete="new-password" error={errors.confirmation} onClear={clearError} className="h-9" />
        </SettingsField>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Link href="/recuperar-senha" className="text-sm font-medium text-brand underline-offset-4 hover:underline">
            Esqueceu a senha atual?
          </Link>
          <SubmitButton pending={passwordPending} pendingLabel="Alterando…" className="w-auto px-4">
            Alterar senha
          </SubmitButton>
        </div>
      </form>

      <form action={sessionsAction} className="rounded-xl border p-4">
        <p className="text-sm font-semibold text-foreground">Sessões em outros dispositivos</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Encerra o acesso em todos os navegadores e aparelhos, menos neste.</p>
        {sessions.status === 'error' && (
          <Notice tone="error" title="Não foi possível encerrar" className="mt-3">
            {sessions.message}
          </Notice>
        )}
        <SubmitButton variant="outline" pending={sessionsPending} pendingLabel="Encerrando…" className="mt-3 h-8 w-auto px-3">
          Encerrar outras sessões
        </SubmitButton>
      </form>

      <Notice title="Verificação em duas etapas">
        Ainda não disponível. Está prevista primeiro para proprietários e administradores, que gerenciam pessoas e dados da organização.
      </Notice>
    </div>
  );
}

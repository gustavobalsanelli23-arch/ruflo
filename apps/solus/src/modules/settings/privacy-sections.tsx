'use client';

import Link from 'next/link';
import { Notice } from '@/components/data/states';
import { formatCount, formatPrice, planById, type PlanId } from '@/config/plans';
import { deleteAccountAction } from '@/modules/auth/account-actions';
import { PasswordInput, SubmitButton, TextInput, useValidatedAction } from '@/modules/auth/form-kit';
import { IDLE } from '@/modules/auth/form-state';
import { deleteAccountSchema } from '@/schemas/auth';
import { SettingsField } from './settings-frame';

const linkClass = 'font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:underline';

export function PlanSection({ plan: planId }: { plan: PlanId }) {
  const plan = planById(planId);
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Plano atual</p>
        <p className="mt-1 text-xl font-semibold text-foreground">
          {plan.name} <span className="text-sm font-normal text-muted-foreground">· {formatPrice(plan.monthlyPrice)}{plan.monthlyPrice > 0 ? ' por mês' : ''}</span>
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Pessoas</dt>
            <dd className="font-medium text-foreground">até {plan.limits.members}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Linhas guardadas</dt>
            <dd className="font-medium text-foreground">até {formatCount(plan.limits.rows)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Perguntas à IA por dia</dt>
            <dd className="font-medium text-foreground">até {plan.limits.aiPerDay}</dd>
          </div>
        </dl>
      </div>
      <p className="text-sm text-muted-foreground">
        Compare os planos e veja como mudar na{' '}
        <Link href="/planos" className={linkClass}>
          página de planos
        </Link>
        . Ao chegar a um limite, nada é apagado: só a ação nova é recusada.
      </p>
    </div>
  );
}

export function PrivacySection() {
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(deleteAccountSchema, deleteAccountAction, IDLE);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-sm text-foreground">
        <h3 className="font-semibold">Seus dados</h3>
        <p className="text-muted-foreground">
          Guardamos só o necessário: nome, e-mail, as organizações de que você faz parte e o que a sua empresa importa. Sem anúncios nem
          rastreamento. Veja a{' '}
          <Link href="/privacidade" className={linkClass}>
            política de privacidade
          </Link>{' '}
          e a{' '}
          <Link href="/cookies" className={linkClass}>
            política de cookies
          </Link>
          .
        </p>
      </div>

      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-xl border border-critical/40 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Excluir minha conta</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Apaga sua conta para sempre. Organizações em que você é a única pessoa são apagadas junto, com os dados e as planilhas
            importadas. Nas outras, você só deixa de fazer parte. Se for o único proprietário de uma organização com outras pessoas, torne
            outra pessoa proprietária antes.
          </p>
        </div>
        {state.status === 'error' && state.message && (
          <Notice tone="error" title="A conta não foi excluída">
            {state.message}
          </Notice>
        )}
        <SettingsField id="password" label="Senha atual" error={errors.password}>
          <PasswordInput name="password" autoComplete="current-password" error={errors.password} onClear={clearError} className="h-9" />
        </SettingsField>
        <SettingsField id="confirmation" label="Para confirmar, digite EXCLUIR" error={errors.confirmation}>
          <TextInput name="confirmation" autoComplete="off" spellCheck={false} error={errors.confirmation} onClear={clearError} className="h-9" />
        </SettingsField>
        <div className="flex justify-end border-t pt-5">
          <SubmitButton variant="destructive" pending={pending} pendingLabel="Excluindo…" className="w-auto px-4">
            Excluir minha conta
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

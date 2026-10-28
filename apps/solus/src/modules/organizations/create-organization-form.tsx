'use client';

import { Notice } from '@/components/data/states';
import { Field, SubmitButton, TextInput, useValidatedAction } from '@/modules/auth/form-kit';
import { IDLE } from '@/modules/auth/form-state';
import { createOrganizationSchema } from '@/schemas/organization';
import { createOrganizationAction } from './actions';

export function CreateOrganizationForm() {
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(
    createOrganizationSchema,
    createOrganizationAction,
    IDLE,
  );
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {state.status === 'error' && state.message && (
        <Notice tone="error" title="Não foi possível criar a organização">
          {state.message}
        </Notice>
      )}
      <Field name="name" label="Nome da empresa" error={errors.name} hint="Como a equipe reconhece a empresa. Dá para mudar depois.">
        <TextInput
          name="name"
          autoComplete="organization"
          defaultValue={state.values?.name}
          error={errors.name}
          hint="Como a equipe reconhece a empresa. Dá para mudar depois."
          onClear={clearError}
          placeholder="Ex.: Mercearia Bom Grão"
          maxLength={80}
        />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Criando organização…">
        Criar organização
      </SubmitButton>
    </form>
  );
}

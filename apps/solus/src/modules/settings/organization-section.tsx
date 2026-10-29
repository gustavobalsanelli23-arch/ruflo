'use client';

import { LogOut } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Notice } from '@/components/data/states';
import { redirectIfSignedOut } from '@/components/shell/session-watch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { can, ROLE_LABEL } from '@/lib/auth/permissions';
import type { Role } from '@/lib/data/types';
import { SubmitButton, TextInput, useValidatedAction } from '@/modules/auth/form-kit';
import { IDLE } from '@/modules/auth/form-state';
import { deleteOrganizationAction, leaveOrganizationAction, renameOrganizationAction } from '@/modules/organizations/actions';
import { deleteOrganizationSchema, renameOrganizationSchema } from '@/schemas/organization';
import { SettingsField } from './settings-frame';

export interface OrganizationInfo {
  name: string;
  slug: string;
}

export function OrganizationSection({ organization, role }: { organization: OrganizationInfo; role: Role }) {
  const canEdit = can(role, 'updateOrganization');
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(
    renameOrganizationSchema,
    renameOrganizationAction,
    IDLE,
  );

  useEffect(() => {
    if (redirectIfSignedOut(state)) return;
    if (state.status === 'success') toast.success(state.message ?? 'Alterações salvas');
  }, [state]);

  return (
    <div className="flex flex-col gap-8">
      <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {state.status === 'error' && state.message && (
          <Notice tone="error" title="Não foi possível salvar">
            {state.message}
          </Notice>
        )}
        <SettingsField
          id="name"
          label="Nome"
          hint={canEdit ? 'Aparece para todos os membros.' : 'Somente proprietários e administradores alteram o nome.'}
          error={errors.name}
        >
          <TextInput
            name="name"
            autoComplete="organization"
            defaultValue={state.values?.name ?? organization.name}
            readOnly={!canEdit}
            maxLength={80}
            error={errors.name}
            onClear={clearError}
            className="h-9"
          />
        </SettingsField>
        <SettingsField id="slug" label="Identificador" hint="Criado com a organização. Não muda.">
          <Input id="slug" value={organization.slug} readOnly className="h-9 bg-muted/50 px-3 font-mono text-sm" />
        </SettingsField>
        <SettingsField id="papel" label="Seu papel">
          <p id="papel" className="pt-1.5 text-sm text-foreground">
            {ROLE_LABEL[role]}
          </p>
        </SettingsField>
        {canEdit && (
          <div className="flex justify-end border-t pt-5">
            <SubmitButton pending={pending} pendingLabel="Salvando…" className="w-auto px-4">
              Salvar nome
            </SubmitButton>
          </div>
        )}
      </form>

      <LeaveOrganization name={organization.name} />
      {can(role, 'deleteOrganization') && <DeleteOrganization name={organization.name} />}
    </div>
  );
}

function LeaveOrganization({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const leave = () =>
    startTransition(async () => {
      const result = await leaveOrganizationAction();
      if (redirectIfSignedOut(result)) return;
      if (result.status === 'error') {
        setOpen(false);
        toast.error('Não foi possível sair', { description: result.message });
      }
    });

  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm font-semibold text-foreground">Sair da organização</p>
      <p className="mt-0.5 text-sm text-muted-foreground">Você perde o acesso aos dados de {name}. Para voltar, precisa de um novo convite.</p>
      <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>
        <LogOut aria-hidden="true" />
        Sair da organização
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sair de {name}?</DialogTitle>
            <DialogDescription>
              Seu acesso termina agora. Se você for o único proprietário, torne outra pessoa proprietária antes de sair.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Continuar na organização</Button>
            </DialogClose>
            <Button variant="destructive" onClick={leave} disabled={pending}>
              {pending ? 'Saindo…' : 'Sair da organização'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteOrganization({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const { state, formAction, pending, errors, onSubmit, formRef } = useValidatedAction(deleteOrganizationSchema, deleteOrganizationAction, IDLE);

  useEffect(() => {
    redirectIfSignedOut(state);
  }, [state]);

  return (
    <div className="rounded-xl border border-critical/30 p-4">
      <p className="text-sm font-semibold text-foreground">Excluir organização</p>
      <p className="mt-0.5 text-sm text-muted-foreground">Remove a organização, os membros, os convites e os dados importados. Não pode ser desfeito.</p>
      <Button variant="destructive" className="mt-3" onClick={() => setOpen(true)}>
        Excluir organização
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setTyped('');
        }}
      >
        <DialogContent showCloseButton={false}>
          <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Excluir {name}?</DialogTitle>
              <DialogDescription>Todos os dados e acessos serão apagados de forma permanente. Para confirmar, digite o nome da organização.</DialogDescription>
            </DialogHeader>
            {state.status === 'error' && state.message && (
              <Notice tone="error" title="Não foi possível excluir">
                {state.message}
              </Notice>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmation" className="text-sm font-medium text-foreground">
                Nome da organização
              </label>
              <TextInput
                name="confirmation"
                autoComplete="off"
                spellCheck={false}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={name}
                error={errors.confirmation}
                className="h-9"
              />
              {errors.confirmation && (
                <p id="confirmation-error" className="text-xs text-critical-text">
                  {errors.confirmation}
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <SubmitButton variant="destructive" pending={pending} pendingLabel="Excluindo…" disabled={typed.trim() !== name} className="h-8 w-auto px-3">
                Excluir definitivamente
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

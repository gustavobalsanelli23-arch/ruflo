'use client';

import { Copy, Link2, RotateCw, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, Notice } from '@/components/data/states';
import { redirectIfSignedOut } from '@/components/shell/session-watch';
import { assignableRoles, can, canRemoveMember, invitableRoles, ROLE_LABEL } from '@/lib/auth/permissions';
import type { Role } from '@/lib/data/types';
import { formatDate, pluralize } from '@/lib/format';
import { Field, SubmitButton, TextInput, useValidatedAction } from '@/modules/auth/form-kit';
import { IDLE, type FormState } from '@/modules/auth/form-state';
import { changeMemberRoleAction, inviteMemberAction, removeMemberAction, revokeInvitationAction } from '@/modules/organizations/actions';
import { inviteMemberSchema } from '@/schemas/organization';
import type { InvitationRow, MemberRow } from '@/services/organization-data';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Toast + session handling shared by every quick member action. */
function report(result: FormState, success: string) {
  if (redirectIfSignedOut(result)) return;
  if (result.status === 'error') toast.error('Não foi possível concluir', { description: result.message });
  else toast.success(success);
}

export function TeamSection({
  members,
  invitations,
  role,
  currentUserId,
}: {
  members: MemberRow[];
  invitations: InvitationRow[];
  role: Role;
  currentUserId: string;
}) {
  const manage = can(role, 'manageMembers');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteKey, setInviteKey] = useState(0);
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const [pending, startTransition] = useTransition();

  const changeRole = (member: MemberRow, next: string) =>
    startTransition(async () => {
      report(await changeMemberRoleAction(member.id, next), `${member.name} agora é ${ROLE_LABEL[next as Role].toLowerCase()}.`);
    });

  const remove = (member: MemberRow) =>
    startTransition(async () => {
      report(await removeMemberAction(member.id), `${member.name} não tem mais acesso.`);
      setRemoving(null);
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{pluralize(members.length, 'pessoa com acesso', 'pessoas com acesso')} a esta organização.</p>
        {manage && (
          <Button
            onClick={() => {
              setInviteKey((key) => key + 1);
              setInviteOpen(true);
            }}
          >
            <UserPlus aria-hidden="true" />
            Convidar pessoa
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table aria-busy={pending} scrollLabel="Tabela: membros da organização">
          <caption className="sr-only">Membros da organização</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="bg-muted/50 text-xs">Pessoa</TableHead>
              <TableHead className="bg-muted/50 text-xs">Papel</TableHead>
              <TableHead className="hidden bg-muted/50 text-xs md:table-cell">Membro desde</TableHead>
              <TableHead className="bg-muted/50 text-right text-xs">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const self = member.userId === currentUserId;
              const options = assignableRoles(role, member.role, self);
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-semibold text-brand">
                        {initials(member.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <span className="truncate">{member.name}</span>
                          {self && <Badge variant="neutral">Você</Badge>}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{member.email}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {options.length > 1 ? (
                      <Select value={member.role} onValueChange={(value) => value !== member.role && changeRole(member, value)} disabled={pending}>
                        <SelectTrigger size="sm" className="w-40 bg-card" aria-label={`Papel de ${member.name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">{ROLE_LABEL[member.role]}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(member.joinedAt.slice(0, 10))}</TableCell>
                  <TableCell className="text-right">
                    {!self && canRemoveMember(role, member.role) && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setRemoving(member)} aria-label={`Remover ${member.name}`} disabled={pending}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {manage && <PendingInvitations invitations={invitations} role={role} />}

      {manage && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <InviteForm key={inviteKey} role={role} onDone={() => setInviteOpen(false)} />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remover {removing?.name}?</DialogTitle>
            <DialogDescription>A pessoa perde o acesso à organização imediatamente. Você pode convidá-la de novo depois.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Manter acesso</Button>
            </DialogClose>
            <Button variant="destructive" disabled={pending} onClick={() => removing && remove(removing)}>
              {pending ? 'Removendo…' : 'Remover membro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingInvitations({ invitations, role }: { invitations: InvitationRow[]; role: Role }) {
  const [pending, startTransition] = useTransition();
  const [renewed, setRenewed] = useState<{ email: string; link: string } | null>(null);

  const revoke = (invitation: InvitationRow) =>
    startTransition(async () => report(await revokeInvitationAction(invitation.id), `Convite para ${invitation.email} revogado.`));

  const renew = (invitation: InvitationRow) =>
    startTransition(async () => {
      const data = new FormData();
      data.set('email', invitation.email);
      data.set('role', invitation.role);
      const result = await inviteMemberAction(IDLE, data);
      if (redirectIfSignedOut(result)) return;
      if (result.status === 'success' && result.payload?.link) setRenewed({ email: invitation.email, link: result.payload.link });
      else toast.error('Não foi possível gerar o link', { description: result.message ?? Object.values(result.fieldErrors ?? {})[0] });
    });

  return (
    <section aria-labelledby="convites-titulo" className="flex flex-col gap-3">
      <h3 id="convites-titulo" className="text-sm font-semibold text-foreground">
        Convites pendentes
      </h3>
      {invitations.length === 0 ? (
        <EmptyState icon={Link2} title="Nenhum convite pendente" description="Convites ainda não aceitos aparecem aqui, com a validade de cada link." className="rounded-lg border py-8" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {invitations.map((invitation) => {
            const { expired } = invitation;
            const canRenew = invitableRoles(role).includes(invitation.role);
            return (
              <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[invitation.role]}, {expired ? 'expirado em' : 'vale até'} {formatDate(invitation.expiresAt.slice(0, 10))}
                  </p>
                </div>
                {expired && <Badge variant="warning">Expirado</Badge>}
                <div className="flex gap-1">
                  {canRenew && (
                    <Button variant="ghost" size="sm" onClick={() => renew(invitation)} disabled={pending}>
                      <RotateCw aria-hidden="true" />
                      Novo link
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => revoke(invitation)} disabled={pending}>
                    <Trash2 aria-hidden="true" />
                    Revogar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={renewed !== null} onOpenChange={(open) => !open && setRenewed(null)}>
        <DialogContent>
          {renewed && (
            <>
              <DialogHeader>
                <DialogTitle>Novo link para {renewed.email}</DialogTitle>
                <DialogDescription>O link anterior deixou de funcionar.</DialogDescription>
              </DialogHeader>
              <InvitationLink link={renewed.link} />
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Concluir</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function InviteForm({ role, onDone }: { role: Role; onDone: () => void }) {
  const roles = invitableRoles(role);
  const { state, formAction, pending, errors, onSubmit, clearError, formRef } = useValidatedAction(inviteMemberSchema, inviteMemberAction, IDLE);

  useEffect(() => {
    redirectIfSignedOut(state);
  }, [state]);

  if (state.status === 'success' && state.payload?.link) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Convite criado</DialogTitle>
          <DialogDescription>
            Envie este link para <strong className="font-medium text-foreground">{state.email}</strong>. Ele vale por 7 dias, funciona uma vez e só para
            quem entrar com esse e-mail.
          </DialogDescription>
        </DialogHeader>
        <InvitationLink link={state.payload.link} />
        <DialogFooter>
          <Button onClick={onDone}>Concluir</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Convidar pessoa</DialogTitle>
        <DialogDescription>Gere um link de convite com o papel escolhido. A pessoa entra com o próprio e-mail, que precisa ser este.</DialogDescription>
      </DialogHeader>
      {state.status === 'error' && state.message && (
        <Notice tone="error" title="Não foi possível convidar">
          {state.message}
        </Notice>
      )}
      <Field name="email" label="E-mail" error={errors.email}>
        <TextInput
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          defaultValue={state.values?.email}
          error={errors.email}
          onClear={clearError}
          placeholder="nome@empresa.com.br"
          className="h-9"
        />
      </Field>
      <Field name="role" label="Papel" error={errors.role}>
        <Select name="role" defaultValue={state.values?.role && roles.includes(state.values.role as Role) ? state.values.role : 'analyst'}>
          <SelectTrigger id="role" className="w-full bg-card" aria-invalid={errors.role ? true : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton pending={pending} pendingLabel="Gerando link…" className="h-8 w-auto px-3">
          Gerar link de convite
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

function InvitationLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar', { description: 'Selecione o link e copie manualmente.' });
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="invitation-link" className="text-sm font-medium text-foreground">
        Link do convite
      </label>
      <div className="flex gap-2">
        <Input id="invitation-link" value={link} readOnly onFocus={(event) => event.currentTarget.select()} className="h-9 bg-muted/50 px-3 font-mono text-xs" />
        <Button type="button" variant="outline" className="h-9" onClick={copy}>
          <Copy aria-hidden="true" />
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Este link aparece só agora. Se perder, gere um novo na lista de convites pendentes.</p>
    </div>
  );
}

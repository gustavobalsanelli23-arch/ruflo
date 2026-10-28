'use client';

import { Check, Minus, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Member, Permission, Role } from '@/lib/data/types';
import { ROLE_LABEL, ROLES } from '@/lib/auth/permissions';
import { formatDateTime } from '@/lib/format';

const ASSIGNABLE: Role[] = ['admin', 'analyst', 'viewer'];

export function MembersSection({ initial }: { initial: Member[] }) {
  const [members, setMembers] = useState(initial);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('analyst');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  const invite = () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Informe um e-mail válido, como nome@empresa.com.br.');
      return;
    }
    if (members.some((m) => m.email === value)) {
      setEmailError('Esta pessoa já faz parte da organização.');
      return;
    }
    setMembers((list) => [...list, { id: `inv-${value}`, name: value.split('@')[0] ?? value, email: value, role, status: 'invited', lastActive: null }]);
    toast.success('Convite enviado', { description: `${value} como ${ROLE_LABEL[role].toLowerCase()}. Demonstração: nenhum e-mail foi enviado.` });
    setInviteOpen(false);
    setEmail('');
    setEmailError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{members.length} pessoas com acesso a esta organização.</p>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus aria-hidden="true" />
          Convidar membro
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table scrollLabel="Tabela: membros da organização">
          <caption className="sr-only">Membros da organização</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="bg-muted/50 text-xs">Pessoa</TableHead>
              <TableHead className="bg-muted/50 text-xs">Papel</TableHead>
              <TableHead className="hidden bg-muted/50 text-xs md:table-cell">Último acesso</TableHead>
              <TableHead className="bg-muted/50 text-right text-xs">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-semibold text-brand">
                      {member.name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        {member.name}
                        {member.status === 'invited' && <Badge variant="neutral">Convite enviado</Badge>}
                      </span>
                      <span className="block text-xs text-muted-foreground">{member.email}</span>
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  {member.role === 'owner' ? (
                    <span className="text-sm text-muted-foreground">{ROLE_LABEL.owner}</span>
                  ) : (
                    <Select
                      value={member.role}
                      onValueChange={(value) => {
                        setMembers((list) => list.map((m) => (m.id === member.id ? { ...m, role: value as Role } : m)));
                        toast.success('Papel atualizado', { description: `${member.name} agora é ${ROLE_LABEL[value as Role].toLowerCase()}.` });
                      }}
                    >
                      <SelectTrigger size="sm" className="w-40 bg-card" aria-label={`Papel de ${member.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {member.lastActive ? formatDateTime(member.lastActive) : 'Ainda não acessou'}
                </TableCell>
                <TableCell className="text-right">
                  {member.role !== 'owner' && (
                    <Button variant="ghost" size="icon-sm" onClick={() => setRemoving(member)} aria-label={`Remover ${member.name}`}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              invite();
            }}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Convidar membro</DialogTitle>
              <DialogDescription>A pessoa recebe um e-mail para criar o acesso com o papel escolhido.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError(null);
                }}
                placeholder="nome@empresa.com.br…"
                aria-invalid={emailError !== null}
                aria-describedby={emailError ? 'invite-email-error' : undefined}
              />
              {emailError && (
                <p id="invite-email-error" className="text-xs text-critical-text" role="alert">
                  {emailError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Papel</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="invite-role" className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit">Enviar convite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="destructive"
              onClick={() => {
                if (removing) {
                  setMembers((list) => list.filter((m) => m.id !== removing.id));
                  toast.success('Membro removido', { description: `${removing.name} não tem mais acesso. Demonstração: nada foi gravado.` });
                }
                setRemoving(null);
              }}
            >
              Remover membro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PermissionsSection({ permissions }: { permissions: Permission[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Os papéis têm permissões fixas nesta fase. A autorização é verificada no servidor a cada ação.</p>
      <div className="overflow-x-auto rounded-lg border">
        <Table scrollLabel="Tabela: permissões por papel">
          <caption className="sr-only">Permissões por papel</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-64 bg-muted/50 text-xs">Permissão</TableHead>
              {ROLES.map((r) => (
                <TableHead key={r} className="bg-muted/50 text-center text-xs">
                  {ROLE_LABEL[r]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell>
                  <span className="block font-medium text-foreground">{permission.label}</span>
                  <span className="block text-xs text-muted-foreground">{permission.description}</span>
                </TableCell>
                {ROLES.map((r) => {
                  const allowed = permission.roles.includes(r);
                  return (
                    <TableCell key={r} className="text-center">
                      {allowed ? (
                        <Check aria-label="Permitido" className="mx-auto size-4 text-positive-text" />
                      ) : (
                        <Minus aria-label="Não permitido" className="mx-auto size-4 text-subtle-foreground" />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

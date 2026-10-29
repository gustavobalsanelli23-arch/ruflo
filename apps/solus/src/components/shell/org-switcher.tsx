'use client';

import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import { switchOrganizationAction } from '@/modules/organizations/actions';
import { redirectIfSignedOut } from './session-watch';
import type { ShellContext } from './types';

/**
 * Active organization, always visible. Switching asks the server, which only
 * accepts organizations the person belongs to; every query after that is
 * still filtered by RLS.
 */
export function OrgSwitcher({ context }: { context: ShellContext }) {
  const [pending, startTransition] = useTransition();
  const activeId = context.organization.id;

  const select = (organizationId: string, name: string) => {
    if (organizationId === activeId) return;
    startTransition(async () => {
      const result = await switchOrganizationAction(organizationId);
      if (redirectIfSignedOut(result)) return;
      if (result.status === 'error') toast.error('Não foi possível trocar de organização', { description: result.message });
      else toast.success(`Agora em ${name}`);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 max-w-[min(15rem,46vw)] gap-2 px-2.5"
          aria-label={`Organização ativa: ${context.organization.name}. Trocar de organização`}
          aria-busy={pending}
        >
          <Building2 aria-hidden="true" className="text-muted-foreground" />
          <span className="truncate text-sm font-medium">{context.organization.name}</span>
          <ChevronsUpDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Suas organizações</DropdownMenuLabel>
        {context.memberships.map((membership) => {
          const active = membership.organizationId === activeId;
          return (
            <DropdownMenuItem
              key={membership.organizationId}
              onSelect={() => select(membership.organizationId, membership.name)}
              aria-current={active ? 'true' : undefined}
              className="gap-2.5"
            >
              <Check aria-hidden="true" className={cn('size-4', !active && 'invisible')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{membership.name}</span>
                <span className="block text-xs text-muted-foreground">{ROLE_LABEL[membership.role]}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/organizacoes/nova">
            <Plus aria-hidden="true" /> Criar organização
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

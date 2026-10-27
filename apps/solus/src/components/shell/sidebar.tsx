'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { ChevronsUpDown, LogOut, Settings, UserRound } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NAV_GROUPS, NAV_ITEMS, type NavItem } from '@/config/navigation';
import { cn } from '@/lib/utils';
import type { ShellContext } from './types';

function isActive(pathname: string, item: NavItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, active, count }: { item: NavItem; active: boolean; count?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-sidebar-foreground outline-none',
            'transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'focus-visible:ring-2 focus-visible:ring-sidebar-ring/70',
            'lg:justify-center xl:justify-start',
            active && 'text-sidebar-accent-foreground',
          )}
        >
          {active && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]"
              transition={{ type: 'spring', stiffness: 520, damping: 42 }}
            />
          )}
          {active && (
            <motion.span
              layoutId="sidebar-marker"
              className="absolute top-2 bottom-2 -left-3 w-0.5 rounded-r bg-sidebar-primary"
              transition={{ type: 'spring', stiffness: 520, damping: 42 }}
            />
          )}
          <item.icon
            aria-hidden="true"
            className={cn('relative size-[17px] shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground')}
          />
          <span className="relative truncate lg:sr-only xl:not-sr-only">{item.label}</span>
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                'relative ml-auto min-w-5 rounded-md px-1.5 text-center text-2xs font-medium tabular leading-5',
                'bg-sidebar-primary/15 text-sidebar-primary lg:absolute lg:top-0.5 lg:right-0.5 lg:min-w-4 lg:px-1 lg:leading-4 xl:static xl:min-w-5 xl:px-1.5 xl:leading-5',
              )}
            >
              <span className="sr-only">, </span>
              {count}
              <span className="sr-only"> abertas</span>
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="xl:hidden">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ context }: { context: ShellContext }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-xl backdrop-saturate-150 lg:flex xl:w-[248px]">
      <div className="flex h-14 shrink-0 items-center px-5 lg:justify-center lg:px-0 xl:justify-start xl:px-5">
        <Link href="/visao-geral" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/70" aria-label="SOLUS, ir para a visão executiva">
          <Logo className="lg:hidden xl:inline-flex" />
          <Logo compact className="hidden lg:inline-flex xl:hidden" />
        </Link>
      </div>

      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.id} className={cn(index > 0 && 'mt-6')}>
            <p className="mb-1.5 hidden px-2.5 text-2xs font-medium text-sidebar-muted xl:block">{group.label}</p>
            {index > 0 && <div className="mx-auto mb-3 h-px w-6 bg-sidebar-border xl:hidden" aria-hidden="true" />}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <NavLink
                    item={item}
                    active={isActive(pathname, item)}
                    count={item.id === 'opportunities' ? context.openOpportunities : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <NavLink item={NAV_ITEMS.settings} active={isActive(pathname, NAV_ITEMS.settings)} />
        {context.organization.isDemo && (
          <div className="mt-2 hidden rounded-lg border border-sidebar-border px-3 py-2.5 xl:block">
            <p className="flex items-center gap-2 text-xs font-medium text-sidebar-accent-foreground">
              <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
              Ambiente de demonstração
            </p>
            <p className="mt-1 text-2xs leading-4 text-sidebar-muted">Empresa e números fictícios, para avaliar a interface.</p>
          </div>
        )}
        <UserMenu context={context} />
      </div>
    </aside>
  );
}

function UserMenu({ context }: { context: ShellContext }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/70 lg:justify-center xl:justify-start"
          aria-label={`Conta de ${context.user.name}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
            {context.user.initials}
          </span>
          <span className="min-w-0 flex-1 lg:hidden xl:block">
            <span className="block truncate text-sm font-medium text-sidebar-accent-foreground">{context.user.name}</span>
            <span className="block truncate text-2xs text-sidebar-muted">{context.organization.name}</span>
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-sidebar-muted lg:hidden xl:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium text-foreground">{context.user.name}</span>
          <span className="block text-xs text-muted-foreground">{context.user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/configuracoes?secao=perfil">
              <UserRound aria-hidden="true" /> Meu perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/configuracoes">
              <Settings aria-hidden="true" /> Configurações
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <LogOut aria-hidden="true" /> Sair
          <span className="ml-auto text-2xs text-muted-foreground">com login real</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

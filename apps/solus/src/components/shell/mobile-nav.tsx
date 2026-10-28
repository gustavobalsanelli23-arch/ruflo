'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MOBILE_TABS, NAV_GROUPS, NAV_ITEMS, type NavItem } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { AppLink, useAppPathname } from './base-path';
import type { ShellContext } from './types';
import { useSignOut } from './use-sign-out';

const active = (pathname: string, item: NavItem) => pathname === item.href || pathname.startsWith(`${item.href}/`);

/** Phone bottom bar: the five daily destinations, thumb-reachable. */
export function MobileTabBar() {
  const pathname = useAppPathname(usePathname());
  return (
    <nav
      aria-label="Atalhos"
      className="glass fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_TABS.map((item) => {
          const isActive = active(pathname, item);
          return (
            <li key={item.id}>
              <AppLink
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex h-14 flex-col items-center justify-center gap-1 text-2xs font-medium outline-none transition-colors focus-visible:bg-accent',
                  isActive ? 'text-brand' : 'text-muted-foreground',
                )}
              >
                <item.icon aria-hidden="true" className="size-5" />
                {item.short}
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileMenu({
  open,
  onOpenChange,
  context,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ShellContext;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const pathname = useAppPathname(usePathname());
  const { signOut, pending } = useSignOut();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-[min(86vw,320px)] gap-0 overscroll-contain border-sidebar-border bg-sidebar p-0 text-sidebar-foreground backdrop-blur-xl"
      >
        <SheetHeader className="border-b border-sidebar-border px-5 py-4">
          <SheetTitle asChild>
            <div>
              <Logo />
            </div>
          </SheetTitle>
          <SheetDescription className="text-xs text-sidebar-muted">{context.organization.name}</SheetDescription>
        </SheetHeader>
        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-4">
          {[...NAV_GROUPS, { id: 'account', label: 'Conta', items: [NAV_ITEMS.settings] }].map((group) => (
            <div key={group.id} className="mb-5">
              <p className="mb-1.5 px-2.5 text-2xs font-medium text-sidebar-muted">{group.label}</p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = active(pathname, item);
                  return (
                    <li key={item.id}>
                      <AppLink
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex h-11 items-center gap-3 rounded-lg px-2.5 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/70',
                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent',
                        )}
                      >
                        <item.icon aria-hidden="true" className={cn('size-[18px]', isActive ? 'text-sidebar-primary' : 'text-sidebar-muted')} />
                        <span className="flex-1">{item.label}</span>
                        {item.id === 'opportunities' && context.openOpportunities > 0 && (
                          <span className="rounded-md bg-sidebar-primary/15 px-1.5 text-2xs font-medium leading-5 text-sidebar-primary tabular">
                            {context.openOpportunities}
                          </span>
                        )}
                      </AppLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{context.user.name}</p>
          <p className="truncate text-xs text-sidebar-muted">{context.user.email}</p>
          {context.mode === 'demo' ? (
            <>
              <p className="mt-3 text-xs text-sidebar-muted">
                <span className="mr-2 inline-block size-1.5 rounded-full bg-warning align-middle" aria-hidden="true" />
                Ambiente de demonstração com dados fictícios.
              </p>
              <Link
                href={context.signedIn ? '/visao-geral' : '/entrar'}
                className="mt-3 flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/70"
              >
                <LogIn aria-hidden="true" className="size-4 text-sidebar-muted" />
                {context.signedIn ? 'Ir para a minha organização' : 'Sair da demonstração'}
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={signOut}
              disabled={pending}
              className="mt-3 flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/70 disabled:opacity-60"
            >
              <LogOut aria-hidden="true" className="size-4 text-sidebar-muted" />
              {pending ? 'Saindo…' : 'Sair'}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

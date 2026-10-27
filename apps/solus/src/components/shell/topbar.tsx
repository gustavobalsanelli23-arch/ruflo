'use client';

import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { ThemeToggle } from './theme-toggle';
import type { ShellContext } from './types';

export function Topbar({
  context,
  onOpenCommand,
  onOpenMenu,
}: {
  context: ShellContext;
  onOpenCommand: () => void;
  onOpenMenu: () => void;
}) {
  return (
    <header className="glass sticky top-0 z-30 border-b">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={onOpenMenu} aria-label="Abrir navegação">
          <Menu aria-hidden="true" />
        </Button>
        <Link
          href="/visao-geral"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="SOLUS, ir para a visão executiva"
        >
          <LogoMark className="size-6 text-brand" />
          <span className="text-[12px] font-semibold tracking-[0.22em]" translate="no">
            SOLUS
          </span>
        </Link>

        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-border bg-muted/60 px-3 text-sm text-muted-foreground outline-none transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:flex"
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="flex-1 text-left">Buscar ou ir para…</span>
          <kbd className="rounded border border-border bg-card px-1.5 font-sans text-2xs text-subtle-foreground">⌘&nbsp;K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <p className="hidden text-xs text-subtle-foreground xl:block">
            Dados até <time dateTime={context.dataThrough}>{formatDate(context.dataThrough)}</time>
          </p>
          {context.organization.isDemo && (
            <span className="hidden items-center gap-1.5 rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning-text sm:inline-flex">
              <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
              Demonstração
            </span>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenCommand} aria-label="Buscar">
            <Search aria-hidden="true" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

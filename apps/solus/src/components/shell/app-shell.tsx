'use client';

import { useState } from 'react';
import { CommandMenu } from './command-menu';
import { MobileMenu, MobileTabBar } from './mobile-nav';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import type { ShellContext } from './types';

export function AppShell({ context, children }: { context: ShellContext; children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <a
        href="#conteudo"
        className="fixed top-2 left-2 z-[60] -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>
      <Sidebar context={context} />
      <div className="flex min-h-dvh flex-col transition-[padding] duration-200 ease-(--ease-out-quint) lg:pl-[72px] expanded:pl-[248px]">
        <Topbar context={context} onOpenCommand={() => setCommandOpen(true)} onOpenMenu={() => setMenuOpen(true)} />
        <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-[1480px] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">{children}</div>
        </main>
      </div>
      <MobileTabBar />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} context={context} />
      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} context={context} />
    </>
  );
}

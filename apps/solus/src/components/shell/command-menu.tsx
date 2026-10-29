'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCallback, useEffect } from 'react';
import { MessageSquareText, OctagonAlert, PanelLeft, Plus, Radar, Upload, UserPlus } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { NAV_ITEMS } from '@/config/navigation';
import { useAppHref } from './base-path';
import { useSidebarCollapsed } from './sidebar-state';
import { THEMES } from './theme-toggle';
import type { ShellContext } from './types';

export function CommandMenu({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ShellContext;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [collapsed, toggleSidebar] = useSidebarCollapsed();
  const toHref = useAppHref();
  const go = (href: string) => router.push(toHref(href));
  const tenant = context.mode === 'tenant';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const run = useCallback(
    (action: () => void) => {
      onOpenChange(false);
      action();
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="sm:max-w-xl">
      <Command>
        <CommandInput placeholder="Ir para um módulo, oportunidade ou pergunta…" />
        <CommandList className="max-h-[min(60vh,420px)]">
          <CommandEmpty>Nenhum resultado. Tente outro termo.</CommandEmpty>
          <CommandGroup heading="Ir para">
            {Object.values(NAV_ITEMS).map((item) => (
              <CommandItem key={item.id} value={`${item.label} ${item.module}`} onSelect={() => run(() => go(item.href))}>
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
                <CommandShortcut className="hidden max-w-[50%] truncate tracking-normal sm:block">{item.description}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Ações">
            <CommandItem value="importar planilha dados" onSelect={() => run(() => go('/dados'))}>
              <Upload aria-hidden="true" />
              <span>Importar planilha</span>
            </CommandItem>
            {tenant ? (
              <>
                <CommandItem value="convidar membro equipe pessoas" onSelect={() => run(() => go('/configuracoes?secao=membros'))}>
                  <UserPlus aria-hidden="true" />
                  <span>Convidar pessoas para a organização</span>
                </CommandItem>
                <CommandItem value="criar nova organização empresa" onSelect={() => run(() => router.push('/organizacoes/nova'))}>
                  <Plus aria-hidden="true" />
                  <span>Criar organização</span>
                </CommandItem>
              </>
            ) : (
              <CommandItem value="itens em risco de ruptura estoque" onSelect={() => run(() => go('/estoque?filtro=ruptura#itens'))}>
                <OctagonAlert aria-hidden="true" />
                <span>Ver itens em risco de ruptura</span>
              </CommandItem>
            )}
            <CommandItem value="menu lateral recolher expandir" onSelect={() => run(toggleSidebar)}>
              <PanelLeft aria-hidden="true" />
              <span>{collapsed ? 'Expandir o menu lateral' : 'Recolher o menu lateral'}</span>
              <CommandShortcut className="hidden tracking-normal sm:block">Telas largas</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          {context.quickOpportunities.length > 0 && (
            <CommandGroup heading="Oportunidades prioritárias">
              {context.quickOpportunities.map((op) => (
                <CommandItem key={op.id} value={op.title} onSelect={() => run(() => go(`/oportunidades?id=${op.id}`))}>
                  <Radar aria-hidden="true" />
                  <span className="truncate">{op.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {context.quickQuestions.length > 0 && (
            <CommandGroup heading="Perguntar ao analista">
              {context.quickQuestions.map((q) => (
                <CommandItem key={q.id} value={q.question} onSelect={() => run(() => go(`/analista?pergunta=${q.id}`))}>
                  <MessageSquareText aria-hidden="true" />
                  <span className="truncate">{q.question}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Tema">
            {THEMES.map((theme) => (
              <CommandItem key={theme.id} value={`tema ${theme.label} ${theme.hint}`} onSelect={() => run(() => setTheme(theme.id))}>
                <theme.icon aria-hidden="true" />
                <span>{theme.label}</span>
                <CommandShortcut className="tracking-normal">{theme.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

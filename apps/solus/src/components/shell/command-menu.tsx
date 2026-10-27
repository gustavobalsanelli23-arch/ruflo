'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCallback, useEffect } from 'react';
import { MessageSquareText, Radar } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { NAV_ITEMS } from '@/config/navigation';
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
              <CommandItem key={item.id} value={`${item.label} ${item.module}`} onSelect={() => run(() => router.push(item.href))}>
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
                <CommandShortcut className="hidden max-w-[50%] truncate tracking-normal sm:block">{item.description}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Oportunidades prioritárias">
            {context.quickOpportunities.map((op) => (
              <CommandItem key={op.id} value={op.title} onSelect={() => run(() => router.push(`/oportunidades?id=${op.id}`))}>
                <Radar aria-hidden="true" />
                <span className="truncate">{op.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Perguntar ao analista">
            {context.quickQuestions.map((q) => (
              <CommandItem key={q.id} value={q.question} onSelect={() => run(() => router.push(`/analista?pergunta=${q.id}`))}>
                <MessageSquareText aria-hidden="true" />
                <span className="truncate">{q.question}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
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

'use client';

import type { LucideIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/data/segmented';
import { THEMES, useMounted } from '@/components/shell/theme-toggle';
import { cn } from '@/lib/utils';

/**
 * Layout shared by the demo and the real settings: section navigation
 * (synced to `?secao=`), the section header and the labelled field row.
 */

export interface SettingsSection {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export function SettingsFrame({
  sections,
  children,
}: {
  sections: SettingsSection[];
  children: (section: string) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get('secao');
  const current = sections.find((s) => s.id === requested) ?? sections[0]!;
  const go = (id: string) => router.replace(`${pathname}?secao=${id}`, { scroll: false });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Seções de configuração" className="hidden lg:block">
        <ul className="sticky top-20 flex flex-col gap-0.5">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={s.id === current.id ? 'page' : undefined}
                className={cn(
                  'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60',
                  s.id === current.id ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                <s.icon aria-hidden="true" className="size-4" />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <div className="mb-6 lg:hidden">
          <Segmented value={current.id} onChange={go} label="Seções de configuração" options={sections.map((s) => ({ value: s.id, label: s.label }))} />
        </div>
        <section aria-labelledby="secao-titulo" className="surface rounded-xl p-5 sm:p-6">
          <header className="mb-6">
            <h2 id="secao-titulo" className="text-lg font-semibold tracking-[-0.01em]">
              {current.label}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{current.description}</p>
          </header>
          {children(current.id)}
        </section>
      </div>
    </div>
  );
}

export function SettingsField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6">
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {hint && (
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div className="max-w-md">
        {children}
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-xs text-critical-text">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function ThemePreference() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <fieldset>
      <legend className="text-sm font-medium text-foreground">Tema</legend>
      <p className="mt-0.5 text-xs text-muted-foreground">Aplicado na hora, neste dispositivo.</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
        {THEMES.map((option) => {
          const checked = mounted && theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setTheme(option.id)}
              className={cn(
                'rounded-xl border p-3 text-left outline-none transition-[border-color,box-shadow] hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring/60',
                checked && 'border-brand ring-1 ring-brand',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-16 overflow-hidden rounded-lg border',
                  option.id === 'light' && 'bg-[#f5f7f8]',
                  option.id === 'dark' && 'bg-[#0c131b]',
                  option.id === 'system' && 'bg-[linear-gradient(90deg,#0c131b_50%,#f5f7f8_50%)]',
                )}
              >
                <span className="w-1/4 bg-[#101923]" />
                <span className="flex flex-1 flex-col gap-1.5 p-2">
                  <span className={cn('h-1.5 w-2/3 rounded-full', option.id === 'light' ? 'bg-[#17212b]/30' : 'bg-white/25')} />
                  <span className={cn('h-5 rounded', option.id === 'light' ? 'bg-white shadow-sm' : 'bg-white/8')} />
                </span>
              </span>
              <span className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <option.icon aria-hidden="true" className="size-4 text-muted-foreground" />
                {option.label}
              </span>
              <span className="block text-xs text-muted-foreground">{option.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

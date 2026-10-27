'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useTransition } from 'react';
import { CalendarDays } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PeriodKey } from '@/lib/data/types';
import { PERIOD_OPTIONS } from '@/lib/period';
import { cn } from '@/lib/utils';
import { Segmented } from './segmented';

interface PeriodState {
  period: PeriodKey;
  pending: boolean;
  setPeriod: (key: PeriodKey) => void;
}

const PeriodContext = createContext<PeriodState | null>(null);

/**
 * Owns the period filter for a screen. The period lives in the URL (?periodo=)
 * so views are shareable; while the server re-renders, the previous frame
 * stays on screen at reduced opacity instead of flashing skeletons.
 */
export function PeriodScope({ period, children }: { period: PeriodKey; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setPeriod = (key: PeriodKey) => {
    const next = new URLSearchParams(params.toString());
    next.set('periodo', key);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return <PeriodContext.Provider value={{ period, pending, setPeriod }}>{children}</PeriodContext.Provider>;
}

function usePeriod() {
  const state = useContext(PeriodContext);
  if (!state) throw new Error('PeriodSelect precisa estar dentro de PeriodScope');
  return state;
}

export function PeriodFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = usePeriod();
  return (
    <div
      aria-busy={pending}
      className={cn('transition-opacity duration-200', pending && 'pointer-events-none opacity-55', className)}
    >
      {children}
    </div>
  );
}

export function PeriodSelect({ options = PERIOD_OPTIONS.map((o) => o.key) }: { options?: PeriodKey[] }) {
  const { period, setPeriod, pending } = usePeriod();
  const available = PERIOD_OPTIONS.filter((o) => options.includes(o.key));
  return (
    <div className="flex items-center gap-2">
      <span className="sr-only" aria-live="polite">
        {pending ? 'Atualizando período…' : ''}
      </span>
      <Segmented
        value={period}
        onChange={setPeriod}
        label="Período de análise"
        className="hidden sm:inline-flex"
        options={available.map((option) => ({ value: option.key, label: option.short, ariaLabel: option.label }))}
      />
      <Select value={period} onValueChange={(value) => setPeriod(value as PeriodKey)}>
        <SelectTrigger className="w-full bg-card sm:hidden" aria-label="Período de análise">
          <CalendarDays aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {available.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/format';

interface StepCardProps {
  n: number;
  title: string;
  active: boolean;
  done: boolean;
  /** Resumo exibido quando a etapa está concluída e fechada. */
  summary?: React.ReactNode;
  onEdit?(): void;
  children: React.ReactNode;
}

/** Etapa do checkout: aberta (ativa), concluída (resumo + Alterar) ou futura. */
export function StepCard({ n, title, active, done, summary, onEdit, children }: StepCardProps) {
  const ref = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (active) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [active]);

  return (
    <section
      ref={ref}
      aria-labelledby={`step-${n}`}
      aria-current={active ? 'step' : undefined}
      className={cn(
        'scroll-mt-24 rounded-2xl ring-1 transition-[background-color,box-shadow] duration-300',
        active ? 'bg-surface ring-brand-500/40' : 'bg-surface/60 ring-white/[0.06]',
      )}
    >
      <header className="flex items-center gap-3 p-4 sm:p-5">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors',
            done && !active ? 'bg-brand-500 text-white' : active ? 'bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/50' : 'bg-white/[0.05] text-subtle',
          )}
          aria-hidden
        >
          {done && !active ? <Check className="animate-pop size-4" /> : n}
        </span>
        <h2 id={`step-${n}`} className={cn('flex-1 text-base font-bold', active || done ? 'text-fg' : 'text-muted')}>
          {title}
        </h2>
        {done && !active && onEdit && (
          <button type="button" onClick={onEdit} className="text-sm font-semibold text-brand-300 underline-offset-4 hover:underline">
            Alterar
          </button>
        )}
      </header>
      {!active && done && summary && <div className="-mt-2 px-4 pb-4 pl-[3.75rem] text-sm text-fg-2 sm:px-5 sm:pl-[4rem]">{summary}</div>}
      {active && <div className="animate-fade-up border-t border-white/[0.06] px-4 py-5 sm:px-5 sm:py-6">{children}</div>}
    </section>
  );
}

/** Indicador de progresso compacto (topo do checkout). */
export function CheckoutProgress({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted" aria-live="polite">
        Etapa {step} de {labels.length} · <span className="text-fg">{labels[step - 1]}</span>
      </p>
      <div className="flex gap-1.5" aria-hidden>
        {labels.map((l, i) => (
          <span key={l} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <span className={cn('block h-full origin-left bg-brand-500 transition-transform duration-500 ease-[var(--ease-out-fz)]', i < step ? 'scale-x-100' : 'scale-x-0')} />
          </span>
        ))}
      </div>
    </div>
  );
}

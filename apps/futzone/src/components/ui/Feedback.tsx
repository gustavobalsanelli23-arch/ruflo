import { Info } from 'lucide-react';
import { cn } from '@/lib/format';
import { Reveal } from './Reveal';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('animate-fade-up flex flex-col items-center justify-center rounded-3xl bg-surface/60 px-6 py-16 text-center sm:py-20', className)}>
      {icon && (
        <div className="relative mb-6 grid size-16 place-items-center rounded-full bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/25">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/10 [animation-duration:2.4s]" aria-hidden />
          {icon}
        </div>
      )}
      <h3 className="heading-display text-3xl text-fg">{title}</h3>
      {description && <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-7 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

/** Aviso padronizado para funções que são apenas demonstração nesta etapa. */
export function DemoNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border border-brand-500/25 bg-brand-500/[0.07] px-4 py-3 text-sm text-fg-2', className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-brand-400" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn('mb-7 flex items-end justify-between gap-6 sm:mb-9', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="heading-display text-[2.1rem] text-fg sm:text-5xl">{title}</h2>
        {description && <p className="mt-3 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  );
}

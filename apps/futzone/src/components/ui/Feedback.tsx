import { Info } from 'lucide-react';
import { cn } from '@/lib/format';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center', className)}>
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-400">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
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
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex items-end justify-between gap-4 sm:mb-8', className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="heading-display text-3xl sm:text-4xl lg:text-5xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

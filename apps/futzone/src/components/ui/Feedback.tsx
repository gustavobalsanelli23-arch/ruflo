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
    <div className={cn('locker animate-fade-up flex flex-col items-center justify-center rounded-3xl px-6 py-16 text-center sm:py-20', className)}>
      {icon && (
        <div className="relative mb-6 grid size-14 place-items-center rounded-xl border border-line-strong bg-steel-3 text-fg-2">
          {/* luz do armário vazio */}
          <span className="absolute inset-x-2 -top-px h-px bg-light/60" aria-hidden />
          {icon}
        </div>
      )}
      <h3 className="heading-display text-3xl text-fg sm:text-4xl">{title}</h3>
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

/**
 * Cabeçalho de seção apoiado na "linha da prateleira": título forte, descrição
 * opcional logo abaixo e a ação alinhada à direita, sobre uma régua de 1px.
 * Sem rótulos acima do título: o título fala sozinho.
 */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={cn('shelf-line mb-6 flex items-end justify-between gap-6 pb-4 sm:mb-8 sm:pb-5', className)}>
      <div className="max-w-2xl">
        <h2 className="heading-display text-[2.25rem] text-fg sm:text-5xl lg:text-[3.5rem]">{title}</h2>
        {description && <p className="mt-2.5 max-w-[60ch] text-sm leading-relaxed text-muted sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </Reveal>
  );
}

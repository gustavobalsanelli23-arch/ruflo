import { cn } from '@/lib/format';

/** Cabeçalho padrão das páginas internas da loja. */
export function PageHeader({ eyebrow, title, description, className }: { eyebrow?: string; title: string; description?: string; className?: string }) {
  return (
    <div className={cn('relative isolate overflow-hidden border-b border-white/[0.06]', className)}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_120%_at_88%_0%,color-mix(in_oklab,var(--color-brand-600)_18%,transparent),transparent_70%)]" aria-hidden />
      <div className="container-fz py-10 sm:py-16">
        {eyebrow && (
          <p className="animate-fade-up eyebrow mb-4 flex items-center gap-3">
            <span className="h-px w-6 bg-brand-500" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h1 className="animate-fade-up heading-display text-5xl text-fg [animation-delay:60ms] sm:text-6xl lg:text-7xl">{title}</h1>
        {description && <p className="animate-fade-up mt-4 max-w-xl text-fg-2 [animation-delay:120ms]">{description}</p>}
      </div>
    </div>
  );
}

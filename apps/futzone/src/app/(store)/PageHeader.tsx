import { cn } from '@/lib/format';

/** Cabeçalho padrão das páginas internas da loja. */
export function PageHeader({ eyebrow, title, description, className }: { eyebrow?: string; title: string; description?: string; className?: string }) {
  return (
    <div className={cn('relative isolate overflow-hidden border-b border-line', className)}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_120%_at_90%_0%,color-mix(in_oklab,var(--color-brand-500)_20%,transparent),transparent_70%)]" />
      <div className="pitch-lines absolute inset-0 -z-10 opacity-60" />
      <div className="container-fz py-10 sm:py-14">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="heading-display text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-fg-2">{description}</p>}
      </div>
    </div>
  );
}

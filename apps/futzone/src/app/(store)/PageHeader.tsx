import { cn } from '@/lib/format';

export interface PlateDatum {
  label: string;
  value: React.ReactNode;
}

interface PageHeaderProps {
  /**
   * @deprecated A loja não usa rótulos acima do título: o valor é ignorado.
   * Mantido só para não quebrar páginas que ainda passam a prop.
   */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Dado alinhado à direita da linha da prateleira (ex.: total de produtos). */
  meta?: React.ReactNode;
  /** Plaquinha em estêncil do armário (página de time): dados exibidos na placa. */
  plate?: PlateDatum[];
  className?: string;
}

/**
 * Cabeçalho das páginas internas. Título, descrição curta e o dado da página
 * apoiados na linha da prateleira. Com `plate`, vira a placa de aço do time.
 */
export function PageHeader({ title, description, meta, plate, className }: PageHeaderProps) {
  if (plate) return <PlateHeader title={title} description={description} plate={plate} className={className} />;

  return (
    <header className={cn('container-fz pt-8 sm:pt-12 lg:pt-14', className)}>
      <div className="shelf-line flex flex-wrap items-end justify-between gap-x-10 gap-y-3 pb-5 sm:pb-6">
        <div className="min-w-0 max-w-3xl">
          <h1 className="heading-display text-[2.5rem] text-fg sm:text-[3.25rem] lg:text-[4rem]">{title}</h1>
          {description && <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted sm:text-[0.95rem]">{description}</p>}
        </div>
        {meta && <div className="shrink-0 sm:pb-0.5">{meta}</div>}
      </div>
    </header>
  );
}

/**
 * Placa do time: aço do armário, nome em estêncil e os dados (tipo, país,
 * produtos) gravados na própria placa. A luz do teto acende uma vez.
 */
function PlateHeader({ title, description, plate, className }: { title: string; description?: string; plate: PlateDatum[]; className?: string }) {
  return (
    <header className={cn('container-fz pt-6 sm:pt-10', className)}>
      <div className="locker relative isolate overflow-hidden rounded-[var(--radius-card)]">
        <span aria-hidden className="animate-light-on pointer-events-none absolute inset-x-[12%] top-0 h-[2px] bg-light" />
        <span
          aria-hidden
          className="animate-cone-on pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(48%_80%_at_50%_0%,rgb(219_230_255/0.07),transparent_75%)] [animation-delay:220ms]"
        />
        <div className="flex flex-col gap-6 px-5 pb-5 pt-8 sm:px-8 sm:pb-7 sm:pt-11 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
          <h1 className="heading-stencil min-w-0 text-[clamp(2.75rem,9vw,5.75rem)] text-fg [overflow-wrap:anywhere]">{title}</h1>
          <dl className="flex shrink-0 flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4 lg:border-t-0 lg:pb-1.5 lg:pt-0">
            {plate.map((d) => (
              <div key={d.label} className="min-w-[4rem]">
                <dt className="text-xs text-muted">{d.label}</dt>
                <dd className="plate mt-1.5 text-lg tabular-nums text-fg sm:text-xl">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {description && <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-muted sm:text-[0.95rem]">{description}</p>}
    </header>
  );
}

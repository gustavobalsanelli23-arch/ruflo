import Link from 'next/link';
import type { Product, Team } from '@/types/catalog';
import { cn } from '@/lib/format';

interface TeamLockerProps {
  team: Team;
  /** Camisa que o armário guarda (foto real do catálogo); sem ela, o armário aparece vazio. */
  shirt?: Product;
  /** Origem do time (país); nada para agrupamentos do fornecedor como "Outros". */
  origin?: string | null;
  /** Texto do canto direito do rodapé, já no plural certo (ex.: "12 camisas"). */
  meta: string;
  /** Time sem camisa publicada: foto e contagem esmaecidas. */
  dim?: boolean;
  className?: string;
}

/**
 * Armário de time: plaquinha com o nome, a camisa do time no nicho (recorte do peito) e o
 * rodapé com origem e contagem. Vive num banco de armários (gap-px): o anel de 1px faz a
 * emenda com os vizinhos. A luz acende no aço do topo ao apontar ou focar.
 */
export function TeamLocker({ team, shirt, origin, meta, dim, className }: TeamLockerProps) {
  const image = shirt?.images[0];
  return (
    <Link
      href={`/camisas/${team.slug}`}
      className={cn(
        'locker motion-lift group relative flex h-full flex-col rounded-[var(--radius-card)] border-0! ring-1 ring-line transition-[box-shadow,scale] duration-200 ease-[var(--ease-out-fz)] hover:z-10 hover:ring-line-strong focus-visible:z-10 focus-visible:ring-line-strong focus-visible:outline-offset-[-2px] active:scale-[0.98]',
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[16%] -top-px z-10 h-[2px] bg-light opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      <span className="flex h-10 items-center border-b border-line px-3">
        <span className="plate truncate text-[0.95rem] text-fg-2 transition-colors duration-200 group-hover:text-fg group-focus-visible:text-fg">
          {team.name}
        </span>
      </span>
      <span className="relative block aspect-[4/3] overflow-hidden bg-[#0a0c10]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt=""
            width={720}
            height={960}
            loading="lazy"
            decoding="async"
            className={cn(
              'motion-lift h-full w-full object-cover object-[50%_22%] transition-[scale] duration-500 ease-[var(--ease-out-fz)] group-hover:scale-[1.03]',
              dim && 'opacity-55 grayscale',
            )}
          />
        ) : (
          // Armário vazio: o cabide sem camisa
          <span aria-hidden className="absolute inset-0">
            <span className="absolute inset-x-[22%] top-[24%] h-px bg-line-strong" />
            <span className="absolute left-1/2 top-[24%] h-4 w-px -translate-x-1/2 bg-line-strong" />
          </span>
        )}
      </span>
      <span className="flex items-center justify-between gap-3 border-t border-line px-3 py-2 text-xs">
        <span className="min-w-0 truncate text-muted">{origin}</span>
        <span className={cn('shrink-0 font-semibold tabular-nums', dim ? 'text-muted' : 'text-fg-2')}>{meta}</span>
      </span>
    </Link>
  );
}

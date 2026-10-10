import { cn } from '@/lib/format';

/** Bloco de carregamento com brilho suave. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-xl', className)} />;
}

/** Card de produto em carregamento (mesmas proporções do ProductCard). */
export function ProductCardSkeleton() {
  return (
    <div className="locker flex flex-col rounded-[var(--radius-card)]" aria-hidden>
      <div className="flex h-9 items-center justify-between border-b border-line px-3">
        <Skeleton className="h-3 w-1/3 rounded-sm" />
        <Skeleton className="h-3 w-10 rounded-sm" />
      </div>
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="flex flex-col gap-2 border-t border-line p-3">
        <Skeleton className="h-4 w-4/5 rounded-sm" />
        <Skeleton className="h-5 w-1/2 rounded-sm" />
        <Skeleton className="h-3 w-3/5 rounded-sm" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando produtos" className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Página de produto em carregamento, com as medidas da página real: trilha,
 * galeria (miniaturas só no desktop, armário 3:4 com a base) e a coluna de
 * informações (plaquinha, nome, preço, grade de tamanhos e compra).
 */
export function ProductPageSkeleton() {
  return (
    <div role="status" aria-label="Carregando produto">
      <Skeleton className="mb-6 h-4 w-44 rounded-sm" />
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="grid gap-3 lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-4">
          <div className="hidden flex-col gap-2 lg:flex">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-[var(--radius-card)]" />
            ))}
          </div>
          <div className="locker min-w-0 overflow-hidden rounded-[var(--radius-card)] md:[@media(min-height:36rem)]:max-w-[calc((100dvh-9.5rem)*0.75)]">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="h-12 border-t border-line lg:h-11" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <Skeleton className="h-10 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="mt-6 h-10 w-4/5 rounded-sm" />
          <Skeleton className="mt-2 h-10 w-3/5 rounded-sm" />
          <Skeleton className="mt-4 h-9 w-36 rounded-sm" />
          <Skeleton className="mt-5 h-4 w-full max-w-md rounded-sm" />
          <div className="mt-8 border-t border-line pt-6">
            <Skeleton className="h-4 w-24 rounded-sm" />
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="size-12 rounded-[var(--radius-button)]" />
              ))}
            </div>
            <Skeleton className="mt-11 h-13 w-full rounded-[var(--radius-button)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

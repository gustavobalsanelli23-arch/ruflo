import { cn } from '@/lib/format';

/** Bloco de carregamento com brilho suave. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-xl', className)} />;
}

/** Card de produto em carregamento (mesmas proporções do ProductCard). */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="aspect-[3/4] w-full rounded-[var(--radius-card)]" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando produtos" className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Página de produto em carregamento: galeria + coluna de informações. */
export function ProductPageSkeleton() {
  return (
    <div role="status" aria-label="Carregando produto" className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
        <div className="flex gap-2 md:w-20 md:flex-col">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-16 md:h-24 md:w-20" />
          ))}
        </div>
        <Skeleton className="aspect-[3/4] flex-1 rounded-3xl" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="size-12" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-full" />
      </div>
    </div>
  );
}

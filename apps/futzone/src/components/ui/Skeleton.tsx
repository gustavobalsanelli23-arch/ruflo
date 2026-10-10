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
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

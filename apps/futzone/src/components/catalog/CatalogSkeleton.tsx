import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

/**
 * Esqueleto do catálogo inteiro (arara, busca, barra e armários) para o
 * fallback do Suspense: a página não "pula" quando o catálogo hidrata.
 */
export function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_1fr] xl:gap-12">
      <div className="hidden border-t border-line lg:block" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex h-12 items-center justify-between border-b border-line">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="size-4 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="min-w-0">
        <Skeleton className="h-12 w-full" />
        <div className="mb-5 mt-3 flex h-12 items-center justify-between gap-3 border-b border-line pb-2" aria-hidden>
          <Skeleton className="h-3.5 w-28 rounded-sm" />
          <Skeleton className="h-10 w-40" />
        </div>
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}

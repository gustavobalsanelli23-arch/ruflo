import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the module layout (header, figure strip, two panels) so nothing jumps when data lands. */
export default function Loading() {
  return (
    <div role="status" aria-label="Carregando…" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="mt-2 h-24 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Skeleton className="h-80 rounded-xl xl:col-span-8" />
        <Skeleton className="h-80 rounded-xl xl:col-span-4" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

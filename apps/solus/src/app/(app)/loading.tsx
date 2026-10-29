import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div role="status" aria-label="Carregando…" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-xl lg:col-span-8" />
        <Skeleton className="h-80 rounded-xl lg:col-span-4" />
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

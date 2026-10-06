import { Suspense } from 'react';
import { CatalogView, type CatalogPreset } from '@/components/store/CatalogView';
import { PageHeader } from './PageHeader';

/** Página de catálogo reutilizada por /camisas, /retro, /kits, /promocoes e /camisas/[time]. */
export function CatalogPage({ eyebrow, title, description, preset }: { eyebrow?: string; title: string; description?: string; preset?: CatalogPreset }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="container-fz py-8 sm:py-10">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-surface" />}>
          <CatalogView preset={preset} />
        </Suspense>
      </div>
    </>
  );
}

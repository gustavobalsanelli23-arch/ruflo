import { Suspense } from 'react';
import { CatalogView } from '@/components/catalog/CatalogView';
import { CatalogCount } from '@/components/catalog/CatalogCount';
import type { CatalogPreset } from '@/components/catalog/scope';
import { CatalogSkeleton } from '@/components/catalog/CatalogSkeleton';
import { PageHeader, type PlateDatum } from './PageHeader';

interface CatalogPageProps {
  title: string;
  description?: string;
  preset?: CatalogPreset;
  /** Dados da placa do time (página /camisas/[time]); sem eles, cabeçalho padrão. */
  plate?: PlateDatum[];
}

/** Página de catálogo reutilizada por /camisas, /selecoes, /retro, /kits, /promocoes e /camisas/[time]. */
export function CatalogPage({ title, description, preset, plate }: CatalogPageProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        plate={plate}
        meta={plate ? undefined : <CatalogCount preset={preset} />}
      />
      <div className="container-fz pb-14 pt-6 sm:pb-20 sm:pt-8">
        {/* CatalogView lê useSearchParams: o Suspense é obrigatório para a página continuar estática */}
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogView preset={preset} />
        </Suspense>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { PageHeader } from '@/components/data/page-header';
import { getRepository } from '@/lib/data';
import { DataHubView } from '@/modules/data-hub/data-hub-view';

export const metadata: Metadata = { title: 'Dados' };

export default async function DataHubPage() {
  const data = await getRepository().getDataHub();
  return (
    <>
      <PageHeader
        title="Dados"
        description="Envie planilhas de vendas, estoque e compras. A SOLUS valida e organiza tudo antes de usar nas análises."
      />
      <div className="mt-8">
        <DataHubView data={data} />
      </div>
    </>
  );
}

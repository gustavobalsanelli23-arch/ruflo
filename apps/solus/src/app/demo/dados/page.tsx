import type { Metadata } from 'next';
import { PageHeader } from '@/components/data/page-header';
import { demoRepository } from '@/demo/repository';
import { DataHubView } from '@/modules/data-hub/data-hub-view';

export const metadata: Metadata = { title: 'Dados' };

export default async function DataHubPage() {
  const data = await demoRepository.getDataHub();
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

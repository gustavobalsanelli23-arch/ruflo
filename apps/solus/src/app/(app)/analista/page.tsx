import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/data/page-header';
import { getRepository } from '@/lib/data';
import { AnalystWorkspace } from '@/modules/analyst/analyst-workspace';

export const metadata: Metadata = { title: 'Analista' };

export default async function AnalystPage() {
  const data = await getRepository().getAnalyst();
  return (
    <>
      <PageHeader
        title="Analista"
        description="Perguntas sobre os dados da empresa, respondidas com números, fontes e a distinção entre fato e hipótese."
      />
      <div className="mt-8">
        <Suspense>
          <AnalystWorkspace data={data} />
        </Suspense>
      </div>
    </>
  );
}

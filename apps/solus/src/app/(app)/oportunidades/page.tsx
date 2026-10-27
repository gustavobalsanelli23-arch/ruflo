import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/data/page-header';
import { getRepository } from '@/lib/data';
import { OpportunityCenter } from '@/modules/opportunities/opportunity-center';

export const metadata: Metadata = { title: 'Oportunidades' };

export default async function OpportunitiesPage() {
  const repository = getRepository();
  const [opportunities, profit] = await Promise.all([repository.getOpportunities(), repository.getProfitAnalytics('30d')]);
  const productNames = Object.fromEntries(profit.products.map((p) => [p.productId, p.name]));

  return (
    <>
      <PageHeader
        title="Oportunidades"
        description="Ganhos encontrados nos dados da empresa, com a evidência e o plano de cada um."
      />
      <div className="mt-8">
        <Suspense>
          <OpportunityCenter opportunities={opportunities} productNames={productNames} />
        </Suspense>
      </div>
    </>
  );
}

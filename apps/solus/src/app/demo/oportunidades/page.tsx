import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/data/page-header';
import { demoRepository } from '@/demo/repository';
import { OpportunityCenter } from '@/modules/opportunities/opportunity-center';
import { demoAiEnabled, demoAiUnlocked } from '@/services/demo-ai';

export const metadata: Metadata = { title: 'Oportunidades' };

export default async function OpportunitiesPage() {
  const repository = demoRepository;
  const [opportunities, profit] = await Promise.all([repository.getOpportunities(), repository.getProfitAnalytics('30d')]);
  const productNames = Object.fromEntries(profit.products.map((p) => [p.productId, p.name]));
  const analyst = !demoAiEnabled() ? 'off' : (await demoAiUnlocked()) ? 'live' : 'scripted';

  return (
    <>
      <PageHeader
        title="Oportunidades"
        description="Ganhos encontrados nos dados da empresa, com a evidência e o plano de cada um."
      />
      <div className="mt-8">
        <Suspense>
          <OpportunityCenter opportunities={opportunities} productNames={productNames} analyst={analyst} />
        </Suspense>
      </div>
    </>
  );
}

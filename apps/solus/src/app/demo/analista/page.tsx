import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/data/page-header';
import { opportunities } from '@/demo/opportunities';
import { demoRepository } from '@/demo/repository';
import { AnalystWorkspace } from '@/modules/analyst/analyst-workspace';
import { demoAiEnabled, demoAiUnlocked } from '@/services/demo-ai';

export const metadata: Metadata = { title: 'Analista' };

/** Only exists when the demo AI is configured (SOLUS_DEMO_AI=on with an access code); otherwise a 404. */
export default async function AnalystPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!demoAiEnabled()) notFound();
  const data = await demoRepository.getAnalyst();
  const live = await demoAiUnlocked();
  const requested = (await searchParams).oportunidade;
  const found = live && typeof requested === 'string' ? opportunities().find((item) => item.id === requested) : undefined;
  return (
    <>
      <PageHeader
        title="Analista"
        description="Perguntas sobre os dados da empresa, respondidas com números, fontes e a distinção entre fato e hipótese."
      />
      <div className="mt-8">
        <Suspense>
          <AnalystWorkspace
            data={live ? { ...data, threads: [] } : data}
            mode={live ? { kind: 'live', scope: 'demo' } : { kind: 'scripted', unlockable: true }}
            opportunity={found ? { id: found.id, title: found.title } : null}
          />
        </Suspense>
      </div>
    </>
  );
}

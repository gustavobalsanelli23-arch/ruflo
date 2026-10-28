import type { Metadata } from 'next';
import { PageHeader } from '@/components/data/page-header';
import { ModuleEmpty } from '@/modules/workspace/module-empty';

export const metadata: Metadata = { title: 'Analista' };

export default function AnalystPage() {
  return (
    <>
      <PageHeader title="Analista" description="Perguntas sobre os dados da empresa, respondidas com números, fontes e a distinção entre fato e hipótese." />
      <div className="mt-8">
        <ModuleEmpty module="analyst" />
      </div>
    </>
  );
}

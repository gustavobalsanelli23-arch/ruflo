import type { Metadata } from 'next';
import { PageHeader } from '@/components/data/page-header';
import { ModuleEmpty } from '@/modules/workspace/module-empty';

export const metadata: Metadata = { title: 'Oportunidades' };

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader title="Oportunidades" description="Ganhos encontrados nos dados da empresa, com a evidência e o plano de cada um." />
      <div className="mt-8">
        <ModuleEmpty module="opportunities" />
      </div>
    </>
  );
}

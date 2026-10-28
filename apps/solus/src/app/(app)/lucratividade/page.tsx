import type { Metadata } from 'next';
import { PageHeader } from '@/components/data/page-header';
import { ModuleEmpty } from '@/modules/workspace/module-empty';

export const metadata: Metadata = { title: 'Lucratividade' };

export default function ProfitPage() {
  return (
    <>
      <PageHeader title="Lucratividade" description="Margem por produto, categoria e fornecedor, a partir das vendas e dos custos da empresa." />
      <div className="mt-8">
        <ModuleEmpty module="profit" />
      </div>
    </>
  );
}

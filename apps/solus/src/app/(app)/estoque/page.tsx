import type { Metadata } from 'next';
import { PageHeader } from '@/components/data/page-header';
import { ModuleEmpty } from '@/modules/workspace/module-empty';

export const metadata: Metadata = { title: 'Estoque' };

export default function InventoryPage() {
  return (
    <>
      <PageHeader title="Estoque" description="Giro, cobertura, ruptura e capital parado, calculados sobre o estoque real." />
      <div className="mt-8">
        <ModuleEmpty module="inventory" />
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/data/page-header';
import { demoRepository } from '@/demo/repository';
import { SettingsView } from '@/modules/settings/settings-view';

export const metadata: Metadata = { title: 'Configurações' };

export default async function SettingsPage() {
  const data = await demoRepository.getSettings();
  return (
    <>
      <PageHeader title="Configurações" description="Organização, pessoas e preferências." />
      <div className="mt-8">
        <Suspense>
          <SettingsView data={data} />
        </Suspense>
      </div>
    </>
  );
}

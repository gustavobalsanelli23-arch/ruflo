import type { Metadata } from 'next';
import { TeamsGrid } from '@/components/store/TeamsGrid';
import { PageHeader } from '../PageHeader';

export const metadata: Metadata = { title: 'Times' };

export default function TimesPage() {
  return (
    <>
      <PageHeader eyebrow="Escolha seu time" title="Times" description="Clubes e seleções disponíveis na FutZone. Novos times são adicionados apenas cadastrando dados." />
      <div className="container-fz py-10">
        <TeamsGrid />
      </div>
    </>
  );
}

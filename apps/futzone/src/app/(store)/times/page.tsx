import type { Metadata } from 'next';
import { teams } from '@/data/teams';
import { TeamsGrid } from '@/components/catalog/TeamsGrid';
import { HeaderFigure } from '@/components/catalog/HeaderFigure';
import { PageHeader } from '../PageHeader';

export const metadata: Metadata = { title: 'Times' };

export default function TimesPage() {
  return (
    <>
      <PageHeader
        title="Times"
        description="Clubes e seleções do catálogo. Escolha um time para ver todas as camisas dele."
        meta={<HeaderFigure value={teams.length} label="times" />}
      />
      <div className="container-fz pb-14 pt-8 sm:pb-20 sm:pt-10">
        <TeamsGrid />
      </div>
    </>
  );
}

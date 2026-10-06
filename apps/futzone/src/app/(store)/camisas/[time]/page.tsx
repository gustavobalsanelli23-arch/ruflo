import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { teams } from '@/data/teams';
import { teamBySlug } from '@/lib/product';
import { CatalogPage } from '../../CatalogPage';

export const generateStaticParams = () => teams.map((t) => ({ time: t.slug }));

export async function generateMetadata({ params }: { params: Promise<{ time: string }> }): Promise<Metadata> {
  const { time } = await params;
  return { title: teamBySlug(time)?.name ?? 'Time' };
}

export default async function TeamPage({ params }: { params: Promise<{ time: string }> }) {
  const { time } = await params;
  const team = teamBySlug(time);
  if (!team) notFound();
  return (
    <CatalogPage
      eyebrow={team.kind === 'selecao' ? 'Seleção' : `Clube · ${team.country}`}
      title={team.name}
      description={`Todas as camisas ${team.kind === 'selecao' ? 'da seleção' : 'do'} ${team.name} disponíveis na FutZone.`}
      preset={{ teamId: team.id }}
    />
  );
}

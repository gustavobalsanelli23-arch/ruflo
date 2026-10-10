import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { teams } from '@/data/teams';
import { teamBySlug } from '@/lib/product';
import { CatalogCount } from '@/components/catalog/CatalogCount';
import { CatalogPage } from '../../CatalogPage';
import type { PlateDatum } from '../../PageHeader';

export const generateStaticParams = () => teams.map((t) => ({ time: t.slug }));

export async function generateMetadata({ params }: { params: Promise<{ time: string }> }): Promise<Metadata> {
  const { time } = await params;
  return { title: teamBySlug(time)?.name ?? 'Time' };
}

export default async function TeamPage({ params }: { params: Promise<{ time: string }> }) {
  const { time } = await params;
  const team = teamBySlug(time);
  if (!team) notFound();

  const preset = { teamId: team.id };
  // Placa do armário: só dados reais. País some quando repete o nome (seleções) ou é genérico.
  const plate: PlateDatum[] = [
    { label: 'Tipo', value: team.kind === 'selecao' ? 'Seleção' : 'Clube' },
    ...(team.country && team.country !== 'Outros' && team.country !== team.name ? [{ label: 'País', value: team.country }] : []),
    { label: 'Produtos', value: <CatalogCount preset={preset} variant="value" /> },
  ];

  return <CatalogPage title={team.name} plate={plate} preset={preset} />;
}

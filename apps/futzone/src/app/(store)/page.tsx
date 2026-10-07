import { Hero } from '@/components/home/Hero';
import { HomeSections } from '@/components/home/HomeSections';
import { seedProducts } from '@/data/products';
import { teams } from '@/data/teams';

export default function HomePage() {
  const stats = [
    { value: `${seedProducts.filter((p) => p.status === 'published').length}+`, label: 'Modelos' },
    { value: String(teams.length), label: 'Times' },
    { value: '7', label: 'Coleções' },
  ];
  return (
    <>
      <Hero stats={stats} />
      <HomeSections />
    </>
  );
}

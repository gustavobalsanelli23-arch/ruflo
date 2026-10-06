import { Hero } from '@/components/store/Hero';
import { HomeSections } from '@/components/store/HomeSections';
import { seedProducts } from '@/data/products';
import { teams } from '@/data/teams';

export default function HomePage() {
  const stats = [
    { value: `${seedProducts.filter((p) => p.status === 'published').length}+`, label: 'Modelos' },
    { value: String(teams.length), label: 'Times' },
    { value: '5', label: 'Categorias' },
  ];
  return (
    <>
      <Hero stats={stats} />
      <HomeSections />
    </>
  );
}

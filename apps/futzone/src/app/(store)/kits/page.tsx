import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Kits' };

export default function KitsPage() {
  return <CatalogPage eyebrow="Camisa + calção" title="Kits" description="Uniformes completos em tamanhos infantis." preset={{ category: 'kits' }} />;
}

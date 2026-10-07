import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Kits' };

export default function KitsPage() {
  return <CatalogPage eyebrow="Camisa + calção" title="Kits" description="Conjuntos de camisa ou regata com short, adulto e infantil." preset={{ category: 'kits' }} />;
}

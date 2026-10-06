import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Retrô' };

export default function RetroPage() {
  return <CatalogPage eyebrow="Coleção" title="Retrô" description="Releituras de camisas históricas que marcaram gerações." preset={{ category: 'retro' }} />;
}

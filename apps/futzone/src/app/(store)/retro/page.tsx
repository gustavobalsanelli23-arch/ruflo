import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Retrô' };

export default function RetroPage() {
  return <CatalogPage title="Retrô" description="Releituras de camisas que marcaram época. A temporada original está na plaquinha de cada peça." preset={{ category: 'retro' }} />;
}

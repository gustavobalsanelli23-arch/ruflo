import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Kits' };

export default function KitsPage() {
  return <CatalogPage title="Kits" description="Camisa ou regata com calção, em tamanhos adulto e infantil." preset={{ category: 'kits' }} />;
}

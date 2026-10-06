import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Camisas' };

export default function CamisasPage() {
  return <CatalogPage eyebrow="Catálogo completo" title="Camisas" description="Clubes, seleções, retrô, kits e femininas. Use a busca e os filtros para encontrar a sua." />;
}

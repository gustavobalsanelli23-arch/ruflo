import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Camisas' };

export default function CamisasPage() {
  return <CatalogPage title="Camisas" description="Clubes, seleções, retrô, kits e femininas num só catálogo. Busque pelo time, jogador ou temporada." />;
}

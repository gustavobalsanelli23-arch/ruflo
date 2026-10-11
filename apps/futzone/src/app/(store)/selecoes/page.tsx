import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Seleções' };

export default function SelecoesPage() {
  return <CatalogPage title="Seleções" description="Camisas de seleções nacionais, do Brasil à Nigéria." preset={{ category: 'selecoes' }} />;
}

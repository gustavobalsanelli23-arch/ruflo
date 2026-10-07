import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Seleções' };

export default function SelecoesPage() {
  return <CatalogPage eyebrow="Coleção" title="Seleções" description="Vista as cores do seu país — camisas de seleções do mundo todo." preset={{ category: 'selecoes' }} />;
}

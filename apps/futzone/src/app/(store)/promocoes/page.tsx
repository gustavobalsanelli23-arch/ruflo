import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Promoções' };

export default function PromocoesPage() {
  return <CatalogPage eyebrow="Preço especial" title="Promoções" description="Camisas com desconto por tempo limitado." preset={{ onSale: true }} />;
}

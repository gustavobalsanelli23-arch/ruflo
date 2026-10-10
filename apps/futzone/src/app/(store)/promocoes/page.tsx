import type { Metadata } from 'next';
import { CatalogPage } from '../CatalogPage';

export const metadata: Metadata = { title: 'Promoções' };

export default function PromocoesPage() {
  return <CatalogPage title="Promoções" description="Camisas com preço abaixo do original. O valor antigo aparece riscado em cada peça." preset={{ onSale: true }} />;
}

import type { Metadata } from 'next';
import { CartPageView } from '@/components/cart/CartPageView';
import { PageHeader } from '../PageHeader';

export const metadata: Metadata = { title: 'Carrinho' };

export default function CarrinhoPage() {
  return (
    <>
      <PageHeader eyebrow="Seus produtos" title="Carrinho" />
      <div className="container-fz py-8 sm:py-10">
        <CartPageView />
      </div>
    </>
  );
}

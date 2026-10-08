import type { Metadata } from 'next';
import { CheckoutView } from '@/components/checkout/CheckoutView';

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-fz py-8 sm:py-12">
      <div className="mb-8">
        <p className="eyebrow mb-2">Checkout</p>
        <h1 className="heading-display text-5xl text-fg sm:text-6xl">Finalizar compra</h1>
      </div>
      <CheckoutView />
    </div>
  );
}

import type { Metadata } from 'next';
import { CheckoutView } from '@/components/checkout/CheckoutView';
import { PageHeader } from '../PageHeader';

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="Finalizar compra" />
      <div className="container-fz py-8 sm:py-10">
        <CheckoutView />
      </div>
    </>
  );
}

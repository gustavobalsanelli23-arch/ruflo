import type { Metadata } from 'next';
import { OrderSuccess } from '@/components/checkout/OrderSuccess';

export const metadata: Metadata = { title: 'Pedido realizado', robots: { index: false } };

export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { pedido } = await searchParams;
  return (
    <div className="container-fz py-12 sm:py-16">
      <OrderSuccess orderId={typeof pedido === 'string' ? pedido : ''} />
    </div>
  );
}

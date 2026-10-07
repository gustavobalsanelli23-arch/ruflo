import type { Metadata } from 'next';
import { OrderDetailAdmin } from '@/components/admin/OrderDetailAdmin';

export const metadata: Metadata = { title: 'Pedido' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailAdmin id={id} />;
}

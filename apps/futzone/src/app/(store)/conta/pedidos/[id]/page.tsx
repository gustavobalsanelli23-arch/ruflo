import type { Metadata } from 'next';
import { CustomerOrderDetail } from '@/components/account/CustomerOrders';

export const metadata: Metadata = { title: 'Pedido' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerOrderDetail id={id} />;
}

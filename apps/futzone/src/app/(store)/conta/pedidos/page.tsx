import type { Metadata } from 'next';
import { CustomerOrdersList } from '@/components/account/CustomerOrders';

export const metadata: Metadata = { title: 'Meus pedidos' };

export default function Page() {
  return <CustomerOrdersList />;
}

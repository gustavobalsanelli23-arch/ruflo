import type { Metadata } from 'next';
import { OrdersAdmin } from '@/components/admin/OrdersAdmin';

export const metadata: Metadata = { title: 'Pedidos' };

export default function Page() {
  return <OrdersAdmin />;
}

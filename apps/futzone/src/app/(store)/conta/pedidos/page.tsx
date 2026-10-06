import type { Metadata } from 'next';
import { AccountOrders } from '@/components/account/AccountViews';

export const metadata: Metadata = { title: 'Meus pedidos' };

export default function Page() {
  return <AccountOrders />;
}

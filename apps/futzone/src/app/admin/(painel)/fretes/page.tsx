import type { Metadata } from 'next';
import { ShippingAdmin } from '@/components/admin/ShippingAdmin';

export const metadata: Metadata = { title: 'Fretes' };

export default function Page() {
  return <ShippingAdmin />;
}

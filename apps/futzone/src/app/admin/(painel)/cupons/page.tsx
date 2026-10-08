import type { Metadata } from 'next';
import { CouponsAdmin } from '@/components/admin/CouponsAdmin';

export const metadata: Metadata = { title: 'Cupons' };

export default function Page() {
  return <CouponsAdmin />;
}

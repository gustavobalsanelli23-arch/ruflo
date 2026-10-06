import type { Metadata } from 'next';
import { CustomersAdmin } from '@/components/admin/MiscAdmin';

export const metadata: Metadata = { title: 'Clientes' };

export default function Page() {
  return <CustomersAdmin />;
}

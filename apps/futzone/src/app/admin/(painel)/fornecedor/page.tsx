import type { Metadata } from 'next';
import { SupplierAdmin } from '@/components/admin/supplier/SupplierAdmin';

export const metadata: Metadata = { title: 'Integração com fornecedor' };

export default function Page() {
  return <SupplierAdmin />;
}

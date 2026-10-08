import type { Metadata } from 'next';
import { CustomerDetailAdmin } from '@/components/admin/CustomerDetailAdmin';

export const metadata: Metadata = { title: 'Cliente' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailAdmin id={id} />;
}

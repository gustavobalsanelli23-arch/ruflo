import type { Metadata } from 'next';
import { AdminPageHeader } from '@/components/admin/AdminUI';
import { ProductForm } from '@/components/admin/ProductForm';

export const metadata: Metadata = { title: 'Novo produto' };

export default function Page() {
  return (
    <>
      <AdminPageHeader title="Novo produto" description="O produto é salvo nos dados locais e aparece na loja quando publicado." />
      <ProductForm />
    </>
  );
}

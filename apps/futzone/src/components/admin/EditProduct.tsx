'use client';

import { useStoreData } from '@/context/StoreDataContext';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { AdminPageHeader } from './AdminUI';
import { ProductForm } from './ProductForm';

export function EditProduct({ id }: { id: string }) {
  const { products, hydrated } = useStoreData();
  const product = products.find((p) => p.id === id);
  if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-surface" aria-busy="true" />;
  if (!product) return <EmptyState title="Produto não encontrado" action={<LinkButton href="/admin/produtos">Voltar aos produtos</LinkButton>} />;
  return (
    <>
      <AdminPageHeader title="Editar produto" description={product.name} />
      {/* key garante que o formulário reinicie com os dados atualizados */}
      <ProductForm key={product.id} product={product} />
    </>
  );
}

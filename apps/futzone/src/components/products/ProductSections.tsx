'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/types/catalog';
import { usePublicProducts } from '@/context/StoreDataContext';
import { recentlyViewed } from '@/services/engagement';
import { recommend } from '@/lib/recommendations';
import { cn } from '@/lib/format';
import { SectionHeading } from '@/components/ui/Feedback';
import { ProductRail } from './ProductCard';

/** "Você também pode gostar": mesmo time, mesma categoria, retrô e kits. */
export function RecommendedProducts({ references, title = 'Você também pode gostar', className }: { references: Product[]; title?: string; className?: string }) {
  const products = usePublicProducts();
  const list = useMemo(() => recommend(products, references, { limit: 4 }), [products, references]);
  if (!list.length) return null;
  return (
    <section className={cn('mt-20', className)}>
      <SectionHeading title={title} />
      <ProductRail products={list} />
    </section>
  );
}

/** Registra a visualização de um produto (armazenamento local). */
export function useRecordView(productId: string | undefined) {
  useEffect(() => {
    if (productId) recentlyViewed.record(productId);
  }, [productId]);
}

/** "Você viu recentemente": some quando não há histórico. */
export function RecentlyViewed({ excludeId, className }: { excludeId?: string; className?: string }) {
  const products = usePublicProducts();
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => setIds(recentlyViewed.list()), [excludeId]);
  const list = useMemo(
    () => ids.filter((id) => id !== excludeId).map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p).slice(0, 4),
    [ids, products, excludeId],
  );
  if (!list.length) return null;
  return (
    <section className={cn('mt-20', className)}>
      <SectionHeading title="Você viu recentemente" />
      <ProductRail products={list} />
    </section>
  );
}

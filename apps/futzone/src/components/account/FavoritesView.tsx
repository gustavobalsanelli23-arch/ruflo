'use client';

import { Heart } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useFavorites } from '@/context/FavoritesContext';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { ProductGrid } from '@/components/products/ProductCard';

export function FavoritesView() {
  const { ids } = useFavorites();
  const { products } = useStoreData();
  const favorites = ids.map((id) => products.find((p) => p.id === id && p.status === 'published')).filter((p) => !!p);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="heading-display text-4xl">Favoritos</h2>
        {favorites.length > 0 && <p className="text-sm text-muted">{favorites.length} {favorites.length === 1 ? 'produto salvo' : 'produtos salvos'}</p>}
      </div>
      {favorites.length === 0 ? (
        <EmptyState icon={<Heart className="size-6" />} title="Nenhum favorito ainda" description="Toque no coração das camisas para salvar aqui." action={<LinkButton href="/camisas">Explorar camisas</LinkButton>} />
      ) : (
        <ProductGrid products={favorites} />
      )}
    </div>
  );
}

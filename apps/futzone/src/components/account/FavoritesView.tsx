'use client';

import { Heart } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useFavorites } from '@/context/FavoritesContext';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { ProductGrid } from '@/components/products/ProductCard';
import { HeaderFigure } from '@/components/catalog/HeaderFigure';
import { AccountHeading } from './AccountUI';

export function FavoritesView() {
  const { ids } = useFavorites();
  const { products } = useStoreData();
  const favorites = ids.map((id) => products.find((p) => p.id === id && p.status === 'published')).filter((p) => !!p);

  return (
    <div>
      <AccountHeading
        title="Favoritos"
        description="As camisas que você guardou, com preço e tamanhos de agora."
        aside={favorites.length > 0 && <HeaderFigure value={favorites.length} label={favorites.length === 1 ? 'produto salvo' : 'produtos salvos'} />}
      />
      {favorites.length === 0 ? (
        <EmptyState
          headingLevel="h2"
          icon={<Heart className="size-6" strokeWidth={1.75} />}
          title="Nenhum favorito ainda"
          description="Toque no coração das camisas para salvar aqui."
          action={<LinkButton href="/camisas">Explorar camisas</LinkButton>}
        />
      ) : (
        <>
          {/* Os armários usam h3 no nome da camisa: este h2 mantém a ordem dos títulos */}
          <h2 className="sr-only">Camisas salvas</h2>
          <ProductGrid products={favorites} />
        </>
      )}
    </div>
  );
}

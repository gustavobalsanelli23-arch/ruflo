'use client';

import { Heart } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/format';

/** ♡ Adicionar aos favoritos (salvo no navegador até existir conta no servidor). */
export function FavoriteButton({ productId, productName, className, withLabel }: { productId: string; productName: string; className?: string; withLabel?: boolean }) {
  const { isFavorite, toggle } = useFavorites();
  const { notify } = useToast();
  const active = isFavorite(productId);
  const label = active ? `Remover ${productName} dos favoritos` : `Adicionar ${productName} aos favoritos`;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggle(productId);
        notify(added ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.', added ? 'success' : 'info');
      }}
      aria-pressed={active}
      aria-label={label}
      title={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-[transform,color,background-color] duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        className,
      )}
    >
      <Heart key={String(active)} className={cn('size-[1.15rem]', active ? 'animate-pop fill-current text-danger' : '')} />
      {withLabel && <span>{active ? 'Nos favoritos' : 'Adicionar aos favoritos'}</span>}
    </button>
  );
}

'use client';

import type { CategoryId, Product } from '@/types/catalog';
import { cn } from '@/lib/format';
import { JerseyArt, type JerseyCut, type JerseyView } from '@/components/brand/JerseyArt';

const CUT_BY_CATEGORY: Record<CategoryId, JerseyCut> = {
  clubes: 'standard',
  selecoes: 'standard',
  retro: 'retro',
  femininas: 'fitted',
  kits: 'kit',
};

interface ProductImageProps {
  product: Pick<Product, 'name' | 'images' | 'palette' | 'category'>;
  index?: number;
  view?: JerseyView;
  className?: string;
  /** Classes do elemento de imagem/ilustração interno. */
  imageClassName?: string;
}

/**
 * Exibe a foto real do produto quando existir; caso contrário, um placeholder
 * elegante e genérico. A proporção é sempre preservada (object-contain).
 */
export function ProductImage({ product, index = 0, view = 'front', className, imageClassName }: ProductImageProps) {
  const image = product.images[index];
  return (
    <div
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_50%_15%,var(--color-surface-3)_0%,var(--color-surface)_70%)]',
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.src} alt={image.alt || product.name} loading="lazy" className={cn('h-full w-full object-contain', imageClassName)} />
      ) : (
        <JerseyArt
          primary={product.palette.primary}
          secondary={product.palette.secondary}
          cut={CUT_BY_CATEGORY[product.category]}
          view={view}
          title={`${product.name} — imagem ilustrativa`}
          className={cn('h-[82%] w-[82%] drop-shadow-[0_24px_30px_rgba(0,0,0,0.55)]', imageClassName)}
        />
      )}
    </div>
  );
}

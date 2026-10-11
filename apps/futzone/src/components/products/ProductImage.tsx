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
  /** Imagem acima da dobra: carrega com prioridade em vez de lazy. */
  priority?: boolean;
  /** Mostra a 2ª foto ao passar o mouse sobre o elemento pai com `group`. */
  hoverSwap?: boolean;
}

/**
 * Exibe a foto real do produto quando existir; caso contrário, um placeholder
 * genérico. Fotos preenchem o quadro (object-cover) sem distorcer.
 */
export function ProductImage({ product, index = 0, view = 'front', className, imageClassName, priority, hoverSwap }: ProductImageProps) {
  const image = product.images[index];
  const alt = hoverSwap ? product.images[index + 1] : undefined;
  return (
    <div className={cn('relative isolate flex items-center justify-center overflow-hidden bg-surface-2', className)}>
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt || product.name}
            width={720}
            height={960}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            className={cn('h-full w-full object-cover', imageClassName)}
          />
          {alt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={alt.src}
              alt=""
              aria-hidden
              width={720}
              height={960}
              loading="lazy"
              decoding="async"
              className={cn('absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100', imageClassName)}
            />
          )}
        </>
      ) : (
        <JerseyArt
          primary={product.palette.primary}
          secondary={product.palette.secondary}
          cut={CUT_BY_CATEGORY[product.category]}
          view={view}
          title={`${product.name} (imagem ilustrativa)`}
          className={cn('h-[82%] w-[82%] drop-shadow-[0_24px_30px_rgba(0,0,0,0.55)]', imageClassName)}
        />
      )}
    </div>
  );
}

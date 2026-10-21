import type { ImgHTMLAttributes } from 'react';
import type { ImageSet } from '../../data/site';

type Props = {
  image: ImageSet;
  sizes: string;
  priority?: boolean;
  /** Classe do elemento <picture> (útil para preencher o contêiner). */
  pictureClassName?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes' | 'alt' | 'width' | 'height'>;

const srcset = (name: string, widths: number[], ext: string) =>
  widths.map((w) => `/images/${name}-${w}.${ext} ${w}w`).join(', ');

/** URL da maior variante WebP de uma imagem (usada no lightbox e em pré-carregamentos). */
export const largestSrc = (image: ImageSet) => `/images/${image.name}-${image.widths[image.widths.length - 1]}.webp`;

/** Imagem responsiva com srcset, dimensões explícitas (sem CLS) e lazy loading. */
export function Picture({ image, sizes, priority, className, pictureClassName, ...rest }: Props) {
  return (
    <picture className={pictureClassName}>
      {image.avif && <source type="image/avif" srcSet={srcset(image.name, image.widths, 'avif')} sizes={sizes} />}
      <img
        src={largestSrc(image)}
        srcSet={srcset(image.name, image.widths, 'webp')}
        sizes={sizes}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        className={className}
        {...rest}
      />
    </picture>
  );
}

import type { ImgHTMLAttributes } from 'react';
import type { ImageSet } from '../../data/site';

type Props = {
  image: ImageSet;
  sizes: string;
  /** Formatos adicionais além de WebP gerados pelo script de imagens. */
  avif?: boolean;
  priority?: boolean;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes' | 'alt' | 'width' | 'height'>;

const srcset = (name: string, widths: number[], ext: string) =>
  widths.map((w) => `/images/${name}-${w}.${ext} ${w}w`).join(', ');

/** Imagem responsiva com srcset, dimensões explícitas (sem CLS) e lazy loading. */
export function Picture({ image, sizes, avif, priority, className, ...rest }: Props) {
  const largest = image.widths[image.widths.length - 1];
  return (
    <picture>
      {avif && <source type="image/avif" srcSet={srcset(image.name, image.widths, 'avif')} sizes={sizes} />}
      <img
        src={`/images/${image.name}-${largest}.webp`}
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

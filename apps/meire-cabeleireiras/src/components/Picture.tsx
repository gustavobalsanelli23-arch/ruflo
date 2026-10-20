import type { CSSProperties } from 'react';
import images from '../data/images.generated.json';
import type { ImageKey } from '../data/content';

interface PictureProps {
  image: ImageKey;
  alt: string;
  /** Atributo `sizes` do srcset, ex.: "(min-width: 1024px) 30vw, 90vw". */
  sizes: string;
  className?: string;
  imgClassName?: string;
  /** Imagem da primeira dobra: carrega já, com prioridade alta. */
  priority?: boolean;
  /** Enquadramento do recorte (object-position). */
  position?: string;
  style?: CSSProperties;
}

export function srcSet(image: ImageKey, format: 'avif' | 'webp') {
  return images[image].widths.map((w) => `/images/${image}-${w}.${format} ${w}w`).join(', ');
}

export function meta(image: ImageKey) {
  return images[image];
}

/**
 * <picture> com AVIF + WebP responsivos. A cor dominante da foto preenche o
 * espaço enquanto ela carrega, sem salto de layout (width/height reais).
 */
export function Picture({ image, alt, sizes, className, imgClassName, priority, position, style }: PictureProps) {
  const { width, height, widths, color } = images[image];
  const fallback = `/images/${image}-${widths[widths.length - 1]}.webp`;
  return (
    <picture className={className} style={{ backgroundColor: color, ...style }}>
      <source type="image/avif" srcSet={srcSet(image, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(image, 'webp')} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={imgClassName}
        style={position ? { objectPosition: position } : undefined}
        draggable={false}
      />
    </picture>
  );
}

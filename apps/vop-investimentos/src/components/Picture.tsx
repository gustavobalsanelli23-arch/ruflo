import type { CSSProperties } from 'react';
import imagesJson from '../data/images.generated.json';
import type { PhotoSlot } from '../data/media';

export interface ImageMeta {
  width: number;
  height: number;
  widths: number[];
  color: string;
}

const images: Record<string, ImageMeta | undefined> = imagesJson;

export function meta(slot: PhotoSlot): ImageMeta | undefined {
  return images[slot.id];
}

export function hasPhoto(slot: PhotoSlot): boolean {
  return Boolean(images[slot.id]);
}

export function srcSet(id: string, m: ImageMeta, format: 'avif' | 'webp') {
  return m.widths.map((w) => `/images/${id}-${w}.${format} ${w}w`).join(', ');
}

/** URL de uma versão com pelo menos `min` px de largura (Open Graph, pôster). */
export function imageUrl(slot: PhotoSlot, min = 1200, format: 'webp' | 'avif' = 'webp'): string | null {
  const m = images[slot.id];
  if (!m) return null;
  const w = m.widths.find((x) => x >= min) ?? m.widths[m.widths.length - 1];
  return `/images/${slot.id}-${w}.${format}`;
}

interface PictureProps {
  slot: PhotoSlot;
  /** Atributo `sizes` do srcset, ex.: "(min-width: 1024px) 50vw, 100vw". */
  sizes: string;
  className?: string;
  imgClassName?: string;
  /** Imagem da primeira dobra: carrega já, com prioridade alta. */
  priority?: boolean;
  /** Enquadramento do recorte (object-position). */
  position?: string;
  style?: CSSProperties;
  /** Descrição alternativa diferente da do espaço (ou "" para decorativa). */
  alt?: string;
}

/**
 * <picture> com AVIF + WebP responsivos e width/height reais (sem salto de
 * layout); a cor dominante preenche o espaço enquanto a foto carrega. Sem
 * arquivo para o espaço, mostra um bloco grafite discreto.
 */
export function Picture({ slot, sizes, className, imgClassName, priority, position, style, alt }: PictureProps) {
  const m = images[slot.id];
  if (!m) {
    return <span role="img" aria-label={alt ?? slot.alt} className={className} style={{ backgroundColor: '#171717', ...style }} />;
  }
  const fallback = `/images/${slot.id}-${m.widths.find((w) => w >= 1200) ?? m.widths[m.widths.length - 1]}.webp`;
  return (
    <picture className={className} style={{ backgroundColor: m.color, ...style }}>
      <source type="image/avif" srcSet={srcSet(slot.id, m, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(slot.id, m, 'webp')} sizes={sizes} />
      <img
        src={fallback}
        alt={alt ?? slot.alt}
        width={m.width}
        height={m.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={imgClassName}
        style={position || slot.focus ? { objectPosition: position ?? slot.focus } : undefined}
        draggable={false}
      />
    </picture>
  );
}

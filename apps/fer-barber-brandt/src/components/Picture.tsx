import type { CSSProperties, ReactNode } from 'react';
import imagesJson from '../data/images.generated.json';
import type { PhotoSlot } from '../data/content';

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

/** Há fotografia real para este espaço? */
export function hasPhoto(slot: PhotoSlot): boolean {
  return Boolean(images[slot.id]);
}

/** Proporção real da foto (ou a da placa, enquanto ela não chega). */
export function ratioOf(slot: PhotoSlot): number {
  const m = images[slot.id];
  return m ? m.width / m.height : slot.ratio;
}

export function srcSet(id: string, m: ImageMeta, format: 'avif' | 'webp') {
  return m.widths.map((w) => `/images/${id}-${w}.${format} ${w}w`).join(', ');
}

export function largest(slot: PhotoSlot): string | null {
  const m = images[slot.id];
  return m ? `/images/${slot.id}-${m.widths[m.widths.length - 1]}.webp` : null;
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
  /** Índice exibido na placa de espera, ex.: "03". */
  index?: string;
  /** Placa no celular com rótulo e pauta no alto (para o hero, sob o cabeçalho). */
  plateTop?: boolean;
}

/**
 * <picture> com AVIF + WebP responsivos e width/height reais (sem salto de
 * layout); a cor dominante preenche o espaço enquanto a foto carrega.
 * Sem fotografia real para o espaço, mostra a placa de espera.
 */
export function Picture({ slot, sizes, className, imgClassName, priority, position, style, index, plateTop }: PictureProps) {
  const m = images[slot.id];
  if (!m) return <Plate slot={slot} className={className} style={style} index={index} top={plateTop} />;
  const fallback = `/images/${slot.id}-${m.widths[m.widths.length - 1]}.webp`;
  return (
    <picture className={className} style={{ backgroundColor: m.color, ...style }}>
      <source type="image/avif" srcSet={srcSet(slot.id, m, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(slot.id, m, 'webp')} sizes={sizes} />
      <img
        src={fallback}
        alt={slot.alt ?? ''}
        width={m.width}
        height={m.height}
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

/**
 * Placa de espera: ocupa o lugar exato da fotografia real e diz qual foto
 * deve ir ali. Não é imagem decorativa nem foto de banco — é a pauta visível.
 */
export function Plate({
  slot,
  className = '',
  style,
  index,
  top,
}: {
  slot: PhotoSlot;
  className?: string;
  style?: CSSProperties;
  index?: string;
  top?: boolean;
}) {
  const place = top
    ? 'max-lg:top-[calc(var(--header-h)+0.75rem)] max-lg:bottom-auto max-lg:justify-start max-lg:gap-3'
    : '';
  return (
    <div className={`plate ${className}`} style={style} data-plate={slot.id}>
      <span className="sr-only">Fotografia em breve.</span>
      <div aria-hidden="true" className={`absolute inset-3 flex flex-col justify-between sm:inset-4 ${place}`}>
        <div className="flex items-start justify-between gap-4">
          <span className="label text-[0.625rem] text-creme/70">Foto {index ?? slot.id}</span>
          <Crosshair />
        </div>
        <p className="label max-w-[34ch] text-[0.625rem] leading-[1.6] tracking-[0.12em] text-tabaco">{slot.brief}</p>
      </div>
    </div>
  );
}

function Crosshair() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-creme/45" aria-hidden="true">
      <path d="M7 0v14M0 7h14" stroke="currentColor" strokeWidth="1" />
      <circle cx="7" cy="7" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * Moldura com revelação de rolagem (data-reveal="image"): a moldura sobe e o
 * miolo desce na mesma medida — o efeito de máscara só com transform.
 */
export function Frame({
  children,
  className = '',
  delay,
  style,
  kind = 'image',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
  /** "tile": a revelação é montada pelo próprio componente (galeria). */
  kind?: 'image' | 'tile';
}) {
  return (
    <div data-reveal={kind} data-delay={delay} className={`relative overflow-hidden ${className}`} style={style}>
      <div data-reveal-mover className="h-full w-full">
        <div data-reveal-counter className="h-full w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

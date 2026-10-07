'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Product } from '@/types/catalog';
import type { JerseyView } from '@/components/brand/JerseyArt';
import { cn } from '@/lib/format';
import { ProductImage } from './ProductImage';

interface Slide {
  key: string;
  label: string;
  index?: number;
  view?: JerseyView;
}

/**
 * Galeria de imagens. Usa as fotos reais quando existirem; sem fotos, mostra
 * três vistas ilustrativas (frente, costas e detalhe). Proporção fixa 3:4.
 * Desktop: zoom suave que segue o mouse. Celular: deslize para trocar.
 */
export function ProductGallery({ product }: { product: Product }) {
  const slides: Slide[] = product.images.length
    ? product.images.map((img, i) => ({ key: img.src + i, label: img.alt || `Imagem ${i + 1}`, index: i }))
    : [
        { key: 'front', label: 'Frente', view: 'front' },
        { key: 'back', label: 'Costas', view: 'back' },
        { key: 'detail', label: 'Detalhe', view: 'detail' },
      ];
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const touchX = useRef<number | null>(null);
  const go = (delta: number) => setCurrent((c) => (c + delta + slides.length) % slides.length);
  const slide = slides[current];
  const canZoom = product.images.length > 0;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canZoom || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col-reverse gap-3 self-start md:flex-row md:items-start md:gap-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-none md:w-20 md:flex-col" role="tablist" aria-label="Imagens do produto">
        {slides.map((s, i) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={s.label}
            onClick={() => setCurrent(i)}
            className={cn(
              'shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-bg transition-[opacity,box-shadow] duration-200 focus-visible:outline-none',
              i === current ? 'ring-brand-500' : 'opacity-55 ring-transparent hover:opacity-100 focus-visible:ring-white/40',
            )}
          >
            <ProductImage product={product} index={s.index} view={s.view} className="h-20 w-16 md:h-24 md:w-20" />
          </button>
        ))}
      </div>

      <div
        className={cn('group/gallery relative flex-1 overflow-hidden rounded-3xl bg-surface-2', canZoom && 'md:cursor-zoom-in')}
        style={zoom ? ({ '--zoom-origin': `${zoom.x}% ${zoom.y}%` } as React.CSSProperties) : undefined}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom(null)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40 && slides.length > 1) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(-1);
          if (e.key === 'ArrowRight') go(1);
        }}
        tabIndex={slides.length > 1 ? 0 : undefined}
        role="group"
        aria-roledescription="galeria"
        aria-label={`${slide.label} (${current + 1} de ${slides.length})`}
      >
        <ProductImage
          key={slide.key}
          product={product}
          index={slide.index}
          view={slide.view}
          priority={current === 0}
          className="animate-fade aspect-[3/4] w-full"
          imageClassName={cn('origin-[var(--zoom-origin,50%_50%)] transition-transform duration-300 ease-[var(--ease-out-fz)]', zoom && 'scale-[1.8]')}
        />
        {slides.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur transition-[opacity,background-color] duration-200 hover:bg-brand-500 md:opacity-0 md:group-hover/gallery:opacity-100 md:focus-visible:opacity-100" aria-label="Imagem anterior">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white opacity-100 backdrop-blur transition-[opacity,background-color] duration-200 hover:bg-brand-500 md:opacity-0 md:group-hover/gallery:opacity-100 md:focus-visible:opacity-100" aria-label="Próxima imagem">
              <ChevronRight className="size-5" />
            </button>
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
              {slides.map((s, i) => (
                <span key={s.key} className={cn('h-1.5 rounded-full transition-all duration-300', i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/35')} />
              ))}
            </div>
          </>
        )}
        {product.images.length === 0 && (
          <span className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
            Imagem ilustrativa · {slide.label}
          </span>
        )}
      </div>
    </div>
  );
}

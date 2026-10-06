'use client';

import { useState } from 'react';
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
 * três vistas ilustrativas (frente, costas e detalhe). Proporção fixa 4:5.
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
  const go = (delta: number) => setCurrent((c) => (c + delta + slides.length) % slides.length);
  const slide = slides[current];

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
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
              'shrink-0 overflow-hidden rounded-xl border-2 transition-all',
              i === current ? 'border-brand-500' : 'border-transparent opacity-60 hover:opacity-100',
            )}
          >
            <ProductImage product={product} index={s.index} view={s.view} className="h-20 w-16 md:h-24 md:w-20" />
          </button>
        ))}
      </div>

      <div className="relative flex-1 overflow-hidden rounded-3xl border border-line">
        <ProductImage key={slide.key} product={product} index={slide.index} view={slide.view} className="animate-fade aspect-[4/5] w-full" />
        {slides.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-brand-500" aria-label="Imagem anterior">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-brand-500" aria-label="Próxima imagem">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, i) => (
            <span key={s.key} className={cn('h-1.5 rounded-full transition-all', i === current ? 'w-6 bg-brand-500' : 'w-1.5 bg-white/30')} />
          ))}
        </div>
        {product.images.length === 0 && (
          <span className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
            Imagem ilustrativa · {slide.label}
          </span>
        )}
      </div>
    </div>
  );
}

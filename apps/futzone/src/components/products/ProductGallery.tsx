'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
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

type KeyMap = Partial<Record<string, number>>;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ARROW =
  'grid size-11 place-items-center rounded-[var(--radius-button)] text-fg-2 transition-[background-color,color,scale] duration-150 ease-[var(--ease-out-fz)] hover:bg-white/[0.06] hover:text-fg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 lg:size-9';

/**
 * Galeria: a camisa fora do armário. Uma foto grande 3:4 num armário aceso
 * (a luz do teto liga uma vez ao abrir a página). Um único trilho com
 * scroll-snap serve ao deslize do celular e às miniaturas do desktop; o slide
 * atual vem de um IntersectionObserver, sem ouvir o scroll. Sem fotos, mostra
 * três vistas ilustrativas (frente, costas e detalhe), sinalizadas como tal.
 */
export function ProductGallery({ product }: { product: Product }) {
  const slides: Slide[] = product.images.length
    ? product.images.map((img, i) => ({ key: img.src + i, label: img.alt || `Imagem ${i + 1}`, index: i }))
    : [
        { key: 'front', label: 'Frente', view: 'front' },
        { key: 'back', label: 'Costas', view: 'back' },
        { key: 'detail', label: 'Detalhe', view: 'detail' },
      ];
  const total = slides.length;
  const many = total > 1;
  const canZoom = product.images.length > 0;
  const trackId = `${useId()}-galeria`;
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [zooming, setZooming] = useState(false);
  // Destino de uma rolagem programada: slides do meio do caminho não mudam a seleção.
  const pending = useRef<{ index: number; timer: number } | null>(null);
  // Zoom só com mouse/trackpad, fotos reais e sem movimento reduzido (decidido no cliente).
  const [zoomable, setZoomable] = useState(false);

  useEffect(() => {
    setZoomable(canZoom && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion());
  }, [canZoom]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !many || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
          const index = Number((entry.target as HTMLElement).dataset.slide);
          const target = pending.current;
          if (target && target.index !== index) continue;
          if (target) {
            window.clearTimeout(target.timer);
            pending.current = null;
          }
          setCurrent(index);
        }
      },
      { root: track, threshold: 0.6 },
    );
    track.querySelectorAll('[data-slide]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [many, total]);

  useEffect(() => () => window.clearTimeout(pending.current?.timer), []);

  const go = useCallback(
    (to: number) => {
      const track = trackRef.current;
      if (!track || !many) return;
      const index = (to + total) % total;
      if (pending.current) window.clearTimeout(pending.current.timer);
      // Rede de segurança: se o alvo não chegar (deslize no meio do caminho), lê a posição real.
      const settle = () => {
        pending.current = null;
        setCurrent(Math.min(total - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
      };
      pending.current = { index, timer: window.setTimeout(settle, 700) };
      setCurrent(index);
      track.scrollTo({ left: index * track.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
    },
    [many, total],
  );

  const onTrackKey = (e: React.KeyboardEvent) => {
    const to = ({ ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: total - 1 } as KeyMap)[e.key];
    if (to === undefined || !many) return;
    e.preventDefault();
    go(to);
  };

  // Zoom que segue o cursor. A origem vai direto para a variável CSS, sem
  // renderizar a galeria a cada movimento.
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomable) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--zoom-origin', `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
    if (!zooming) setZooming(true);
  };

  const slide = slides[current] ?? slides[0];

  return (
    <div className={cn('grid gap-3', many && 'lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-4')}>
      {many && <SlideTabs variant="thumbs" product={product} slides={slides} current={current} controls={trackId} onSelect={go} />}

      {/* Altura máxima: a foto 3:4 + a base cabem inteiras na tela quando a galeria fica grudada */}
      <div className="min-w-0 md:[@media(min-height:36rem)]:max-w-[calc((100dvh-9.5rem)*0.75)]">
        <div className="locker relative isolate overflow-hidden rounded-[var(--radius-card)]">
          {/* A luz do teto: acende uma vez (fora dos slides, não repete ao trocar de foto) */}
          <span aria-hidden className="animate-light-on pointer-events-none absolute inset-x-[16%] top-0 z-20 h-[2px] bg-light" />
          <span
            aria-hidden
            className="animate-cone-on pointer-events-none absolute inset-x-0 top-0 z-10 aspect-[3/4] bg-[radial-gradient(64%_42%_at_50%_0%,rgb(219_230_255/0.13),transparent_78%)] mix-blend-screen [animation-delay:220ms]"
          />

          <div
            ref={trackRef}
            id={trackId}
            role="group"
            aria-roledescription="galeria"
            aria-label={`${slide.label} (${current + 1} de ${total})`}
            tabIndex={many ? 0 : undefined}
            onKeyDown={onTrackKey}
            onMouseMove={onMove}
            onMouseLeave={() => setZooming(false)}
            className={cn(
              'peer flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-[#0a0c10] scrollbar-none focus-visible:outline-none',
              zoomable && 'cursor-zoom-in',
            )}
          >
            {slides.map((s, i) => (
              <div key={s.key} data-slide={i} aria-hidden={i !== current || undefined} className="w-full shrink-0 snap-center snap-always">
                <ProductImage
                  product={product}
                  index={s.index}
                  view={s.view}
                  priority={i === 0}
                  className="aspect-[3/4] w-full bg-transparent"
                  imageClassName={cn(
                    'motion-lift origin-[var(--zoom-origin,50%_50%)] transition-[scale] duration-300 ease-[var(--ease-out-fz)] motion-reduce:transition-none',
                    zooming && i === current && 'scale-[1.8]',
                  )}
                />
              </div>
            ))}
          </div>
          {/* Foco do trilho desenhado por cima das fotos (o anel do próprio trilho ficaria por baixo) */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden aspect-[3/4] ring-2 ring-inset ring-brand-400 peer-focus-visible:block" />

          {many && (
            <div className="flex h-12 items-center justify-between gap-3 border-t border-line px-1.5 lg:h-11">
              <SlideTabs variant="marks" product={product} slides={slides} current={current} controls={trackId} onSelect={go} />
              {zoomable && (
                <p className="hidden items-center gap-2 pl-1.5 text-xs text-muted lg:flex">
                  <ZoomIn className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  Passe o cursor sobre a foto para ampliar
                </p>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => go(current - 1)} className={ARROW} aria-label="Imagem anterior" aria-controls={trackId}>
                  <ChevronLeft className="size-5" strokeWidth={1.75} />
                </button>
                <button type="button" onClick={() => go(current + 1)} className={ARROW} aria-label="Próxima imagem" aria-controls={trackId}>
                  <ChevronRight className="size-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sem foto real: aviso honesto fora da imagem */}
        {!product.images.length && <p className="mt-2 text-xs text-muted">Imagem ilustrativa · {slide.label}</p>}
      </div>
    </div>
  );
}

interface SlideTabsProps {
  variant: 'thumbs' | 'marks';
  product: Product;
  slides: Slide[];
  current: number;
  controls: string;
  onSelect(index: number): void;
}

/**
 * Seletor de imagens (tablist). Desktop: miniaturas em molduras de aço; a
 * escolhida acende uma faixa de luz azul no topo. Celular: marcas mínimas de
 * posição, sem numeração. Só uma das duas aparece por vez.
 */
function SlideTabs({ variant, product, slides, current, controls, onSelect }: SlideTabsProps) {
  const thumbs = variant === 'thumbs';

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last = slides.length - 1;
    const prev = current === 0 ? last : current - 1;
    const next = current === last ? 0 : current + 1;
    const to = ({ ArrowUp: prev, ArrowLeft: prev, ArrowDown: next, ArrowRight: next, Home: 0, End: last } as KeyMap)[e.key];
    if (to === undefined) return;
    e.preventDefault();
    onSelect(to);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[to]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Imagens do produto"
      aria-orientation={thumbs ? 'vertical' : 'horizontal'}
      onKeyDown={onKeyDown}
      className={thumbs ? 'hidden lg:flex lg:flex-col lg:gap-2' : 'flex items-center lg:hidden'}
    >
      {slides.map((s, i) => {
        const on = i === current;
        return (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={controls}
            aria-label={s.label}
            tabIndex={on ? 0 : -1}
            onClick={() => onSelect(i)}
            className={cn(
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
              thumbs
                ? cn(
                    'relative block w-full overflow-hidden rounded-[var(--radius-card)] border bg-[#0a0c10] transition-[opacity,border-color] duration-200 ease-[var(--ease-out-fz)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                    on ? 'border-line-strong opacity-100' : 'border-line opacity-60 hover:opacity-100',
                  )
                : 'grid h-11 w-7 place-items-center rounded-[var(--radius-button)]',
            )}
          >
            {thumbs ? (
              <>
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-x-2 top-0 z-10 h-[2px] bg-brand-500 transition-[scale,opacity] duration-200 ease-[var(--ease-out-fz)] motion-reduce:scale-x-100',
                    on ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
                  )}
                />
                <ProductImage product={product} index={s.index} view={s.view} className="aspect-[3/4] w-full bg-transparent" />
              </>
            ) : (
              <span aria-hidden className={cn('h-[2px] w-4 transition-[background-color] duration-200', on ? 'bg-fg' : 'bg-fg/25')} />
            )}
          </button>
        );
      })}
    </div>
  );
}

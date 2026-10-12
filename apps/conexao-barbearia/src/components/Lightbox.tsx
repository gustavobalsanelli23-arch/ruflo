import { AnimatePresence, m } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryItem } from '../data/site';
import { useLockBody } from '../hooks/useLockBody';

type Props = {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

const ease = [0.22, 1, 0.36, 1] as const;

export function Lightbox({ items, index, onClose, onIndexChange }: Props) {
  const open = index !== null;
  const [direction, setDirection] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pointerStart = useRef<number | null>(null);
  const swiped = useRef(false);

  useLockBody(open);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      setDirection(delta);
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go, onClose]);

  // Pré-carrega as fotos vizinhas para navegação instantânea.
  useEffect(() => {
    if (index === null) return;
    [1, -1].forEach((d) => {
      const item = items[(index + d + items.length) % items.length];
      const img = new Image();
      img.src = `/images/${item.name}-800.webp`;
    });
  }, [index, items]);

  const item = index !== null ? items[index] : null;

  return (
    <AnimatePresence>
      {item && index !== null && (
        <m.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de cortes ampliada"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          className="fixed inset-0 z-[70] flex flex-col bg-ink/[0.97] backdrop-blur-sm"
          onPointerDown={(e) => (pointerStart.current = e.clientX)}
          onPointerUp={(e) => {
            if (pointerStart.current === null) return;
            const dx = e.clientX - pointerStart.current;
            pointerStart.current = null;
            swiped.current = Math.abs(dx) > 50;
            if (swiped.current) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="container-x flex h-16 shrink-0 items-center justify-between md:h-20">
            <p
              className="text-[0.6875rem] font-semibold tabular-nums tracking-[0.24em] text-bone/70"
              aria-live="polite"
            >
              <span className="text-gold">{String(index + 1).padStart(2, '0')}</span> /{' '}
              {String(items.length).padStart(2, '0')}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar galeria"
              className="-mr-2 flex size-11 items-center justify-center text-bone/80 transition-colors hover:text-gold"
            >
              <X className="size-6" strokeWidth={1.25} aria-hidden="true" />
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-24"
            onClick={() => {
              // Um arraste não deve ser interpretado como clique para fechar.
              if (swiped.current) swiped.current = false;
              else onClose();
            }}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <m.figure
                key={item.name}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ duration: 0.5, ease }}
                className="flex max-h-full flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={`/images/${item.name}-800.webp`}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  draggable={false}
                  className="max-h-[calc(100svh-11rem)] w-auto max-w-full select-none object-contain md:max-h-[calc(100svh-12rem)]"
                />
                <figcaption className="mt-4 text-center font-display text-xl italic text-bone/85">
                  {item.caption}
                </figcaption>
              </m.figure>
            </AnimatePresence>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Foto anterior"
              className="absolute left-6 top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border border-bone/20 text-bone/80 transition-colors hover:border-gold hover:text-gold md:flex"
            >
              <ArrowLeft className="size-5" strokeWidth={1.25} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Próxima foto"
              className="absolute right-6 top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border border-bone/20 text-bone/80 transition-colors hover:border-gold hover:text-gold md:flex"
            >
              <ArrowRight className="size-5" strokeWidth={1.25} aria-hidden="true" />
            </button>
          </div>

          <div className="flex h-20 shrink-0 items-center justify-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Foto anterior"
              className="flex size-12 items-center justify-center border border-bone/20 text-bone/80 active:border-gold active:text-gold"
            >
              <ArrowLeft className="size-5" strokeWidth={1.25} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próxima foto"
              className="flex size-12 items-center justify-center border border-bone/20 text-bone/80 active:border-gold active:text-gold"
            >
              <ArrowRight className="size-5" strokeWidth={1.25} aria-hidden="true" />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

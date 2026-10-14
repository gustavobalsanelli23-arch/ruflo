import { AnimatePresence, m } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryItem } from '../data/site';
import { useLockBody } from '../hooks/useLockBody';
import { ArrowLeft, ArrowRight, CloseIcon } from './ui/Icons';

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
  const returnFocus = useRef<HTMLElement | null>(null);
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
    returnFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      returnFocus.current?.focus();
    };
  }, [open, go, onClose]);

  // Pré-carrega as fotos vizinhas para a navegação ficar instantânea.
  useEffect(() => {
    if (index === null) return;
    [1, -1].forEach((d) => {
      const item = items[(index + d + items.length) % items.length];
      const img = new Image();
      img.src = `/images/${item.name}-${item.widths[item.widths.length - 1]}.webp`;
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
          transition={{ duration: 0.3, ease }}
          className="fixed inset-0 z-[70] flex flex-col bg-ink"
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
            <p className="tag tabular-nums text-smoke" aria-live="polite">
              <span className="text-chalk">{String(index + 1).padStart(2, '0')}</span> / {String(items.length).padStart(2, '0')}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar galeria"
              className="-mr-2 flex size-12 items-center justify-center text-paper transition-transform duration-300 hover:rotate-90"
            >
              <CloseIcon className="size-6" />
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
                initial={{ opacity: 0, x: direction * 70, rotate: direction * 1.5 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: direction * -70, rotate: direction * -1.5 }}
                transition={{ duration: 0.45, ease }}
                className="flex max-h-full flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={`/images/${item.name}-${item.widths[item.widths.length - 1]}.webp`}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  draggable={false}
                  className="max-h-[calc(100svh-11rem)] w-auto max-w-full select-none border-[6px] border-paper object-contain md:max-h-[calc(100svh-12rem)]"
                />
                {item.caption && (
                  <figcaption className="poster mt-4 text-center text-2xl text-paper md:text-3xl">{item.caption}</figcaption>
                )}
              </m.figure>
            </AnimatePresence>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Foto anterior"
              className="absolute left-6 top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border-2 border-paper/30 text-paper transition-colors hover:border-chalk hover:bg-chalk hover:text-ink md:flex"
            >
              <ArrowLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Próxima foto"
              className="absolute right-6 top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border-2 border-paper/30 text-paper transition-colors hover:border-chalk hover:bg-chalk hover:text-ink md:flex"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>

          <div className="flex h-20 shrink-0 items-center justify-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Foto anterior"
              className="flex size-12 items-center justify-center border-2 border-paper/30 text-paper active:bg-chalk active:text-ink"
            >
              <ArrowLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próxima foto"
              className="flex size-12 items-center justify-center border-2 border-paper/30 text-paper active:bg-chalk active:text-ink"
            >
              <ArrowRight className="size-5" />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

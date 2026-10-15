import { AnimatePresence, m } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryItem } from '../data/site';
import { useLockBody } from '../hooks/useLockBody';
import { ArrowIcon, ArrowUpRightIcon } from './ui/Icons';
import { largestSrc } from './ui/Picture';
import { ease } from './ui/Reveal';

type Props = {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

/** Visualização ampliada: teclado (←/→/Esc), gesto de arrastar e foco preso no diálogo. */
export function Lightbox({ items, index, onClose, onIndexChange }: Props) {
  const open = index !== null;
  const [direction, setDirection] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
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
      else if (e.key === 'Tab' && dialogRef.current) {
        // Mantém o foco dentro do diálogo.
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button, a[href]');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go, onClose]);

  // Pré-carrega as fotos vizinhas para navegação instantânea.
  useEffect(() => {
    if (index === null) return;
    [1, -1].forEach((d) => {
      const img = new Image();
      img.src = largestSrc(items[(index + d + items.length) % items.length]);
    });
  }, [index, items]);

  const item = index !== null ? items[index] : null;

  return (
    <AnimatePresence>
      {item && index !== null && (
        <m.div
          ref={dialogRef}
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Resultados ampliados"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease }}
          className="fixed inset-0 z-[70] flex flex-col bg-ink/[0.97] text-ivory backdrop-blur-sm"
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
            <p className="text-[0.6875rem] font-medium tabular-nums tracking-[0.28em] text-ivory/70" aria-live="polite">
              <span className="text-gold">{String(index + 1).padStart(2, '0')}</span> /{' '}
              {String(items.length).padStart(2, '0')}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="-mr-2 flex h-11 items-center gap-3 px-2 text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-ivory/80 transition-colors hover:text-gold"
            >
              Fechar
              <span className="relative block size-4" aria-hidden="true">
                <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
                <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
              </span>
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-28"
            onClick={() => {
              // Um arraste não deve ser interpretado como clique para fechar.
              if (swiped.current) swiped.current = false;
              else onClose();
            }}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <m.figure
                key={item.name}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ duration: 0.55, ease }}
                className="flex max-h-full flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={largestSrc(item)}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  draggable={false}
                  className="max-h-[calc(100svh-12rem)] w-auto max-w-full select-none object-contain"
                />
                <figcaption className="mt-5 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 text-center">
                  <span className="font-display text-2xl italic text-ivory">{item.caption}</span>
                  <span className="text-[0.625rem] font-medium uppercase tracking-[0.3em] text-ivory/55">
                    {item.date}
                  </span>
                  <a
                    href={item.post}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-line text-[0.625rem] font-medium uppercase tracking-[0.3em] text-gold"
                  >
                    Ver no Instagram <ArrowUpRightIcon className="size-2.5" />
                  </a>
                </figcaption>
              </m.figure>
            </AnimatePresence>

            {[-1, 1].map((d) => (
              <button
                key={d}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(d);
                }}
                aria-label={d < 0 ? 'Foto anterior' : 'Próxima foto'}
                className={`absolute top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border border-ivory/20 text-ivory/80 transition-colors hover:border-gold hover:text-gold md:flex ${
                  d < 0 ? 'left-6' : 'right-6'
                }`}
              >
                <ArrowIcon className={`h-3 w-6 ${d < 0 ? 'rotate-180' : ''}`} />
              </button>
            ))}
          </div>

          <div className="flex h-20 shrink-0 items-center justify-center gap-3 md:hidden">
            {[-1, 1].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => go(d)}
                aria-label={d < 0 ? 'Foto anterior' : 'Próxima foto'}
                className="flex size-12 items-center justify-center border border-ivory/20 text-ivory/80 active:border-gold active:text-gold"
              >
                <ArrowIcon className={`h-3 w-6 ${d < 0 ? 'rotate-180' : ''}`} />
              </button>
            ))}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

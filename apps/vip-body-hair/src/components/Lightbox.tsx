import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { GalleryItem } from '../data/site';
import { useLockBody } from '../hooks/useLockBody';
import { Chevron, Close } from './ui/Icons';
import { Picture } from './ui/Picture';
import { ease } from './ui/Reveal';

type Props = {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
};

/** Visualizador em tela cheia: setas do teclado, Esc, deslizar no celular e foco preso no diálogo. */
export function Lightbox({ items, index, onClose, onIndex }: Props) {
  const open = index !== null;
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  useLockBody(open);

  const go = (delta: number) => {
    if (index === null) return;
    onIndex((index + delta + items.length) % items.length);
  };
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goRef.current(1);
      else if (e.key === 'ArrowLeft') goRef.current(-1);
      else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button');
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
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  const item = index !== null ? items[index] : null;

  return (
    <AnimatePresence>
      {item && (
        <m.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria: ${item.caption}`}
          className="fixed inset-0 z-[60] flex flex-col bg-ink/97 text-bone"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 md:px-10">
            <p className="eyebrow text-[0.6rem] text-mist" aria-live="polite">
              {String(index! + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')} · {item.caption}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="-mr-2 flex h-11 w-11 items-center justify-center"
              aria-label="Fechar galeria"
            >
              <Close width={22} height={22} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 md:px-24 md:pb-10" onClick={onClose}>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={item.image.name}
                className="flex h-full items-center"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease }}
                onClick={(e) => e.stopPropagation()}
              >
                <Picture image={item.image} sizes="(min-width: 768px) 60vw, 92vw" className="max-h-full w-auto object-contain" priority />
              </m.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center border border-bone/20 transition-colors hover:bg-bone hover:text-ink md:left-8 md:flex"
              aria-label="Imagem anterior"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center border border-bone/20 transition-colors hover:bg-bone hover:text-ink md:right-8 md:flex"
              aria-label="Próxima imagem"
            >
              <Chevron />
            </button>
          </div>
          <p className="pb-6 text-center text-xs text-mist md:hidden">Deslize para ver as outras fotos</p>
        </m.div>
      )}
    </AnimatePresence>
  );
}

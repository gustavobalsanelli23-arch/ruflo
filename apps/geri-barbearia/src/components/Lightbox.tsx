import { useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Work } from '../data/content';
import { EASE, gsap, lockScroll, prefersReducedMotion, setupGsap } from '../lib/motion';
import { Picture, largest } from './Picture';

interface LightboxProps {
  items: Work[];
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
  /** Miniaturas da galeria: a foto ampliada "nasce" de onde foi tocada. */
  origins: RefObject<(HTMLButtonElement | null)[]>;
}

export function Lightbox({ items, index, onChange, onClose, origins }: LightboxProps) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const previous = useRef<number | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const open = index !== null;
  const count = items.length;

  const go = (step: number) => {
    if (index === null) return;
    onChange((index + step + count) % count);
  };

  // Abrir, trocar de foto e fechar: tudo passa por aqui.
  useLayoutEffect(() => {
    setupGsap();
    const reduce = prefersReducedMotion();
    const was = previous.current;
    previous.current = index;
    const overlay = root.current;
    const image = frame.current;
    if (!overlay || !image) return;

    if (index !== null && was === null) {
      lockScroll(true);
      gsap.set(overlay, { visibility: 'visible' });
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: reduce ? 0 : 0.5, ease: 'power2.out' });
      const thumb = origins.current?.[index]?.getBoundingClientRect();
      const box = image.getBoundingClientRect();
      if (thumb && !reduce && box.width > 0) {
        gsap.fromTo(
          image,
          {
            x: thumb.left + thumb.width / 2 - (box.left + box.width / 2),
            y: thumb.top + thumb.height / 2 - (box.top + box.height / 2),
            scale: thumb.width / box.width,
          },
          { x: 0, y: 0, scale: 1, duration: 0.95, ease: EASE.out },
        );
      }
      gsap.fromTo('[data-lightbox-ui]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, delay: reduce ? 0 : 0.35 });
      closeBtn.current?.focus({ preventScroll: true });
    } else if (index !== null && was !== null && was !== index) {
      const forward = (index > was && !(was === 0 && index === count - 1)) || (was === count - 1 && index === 0);
      gsap.fromTo(
        image,
        { autoAlpha: 0, x: reduce ? 0 : forward ? 60 : -60 },
        { autoAlpha: 1, x: 0, duration: reduce ? 0 : 0.8, ease: EASE.out },
      );
    } else if (index === null && was !== null) {
      gsap.to(overlay, {
        opacity: 0,
        duration: reduce ? 0 : 0.4,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(overlay, { visibility: 'hidden' });
          lockScroll(false);
        },
      });
    }
  }, [index, count, origins]);

  // Teclado: Esc fecha, setas navegam, Tab fica preso dentro do lightbox.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab') {
        const focusables = [...(root.current?.querySelectorAll<HTMLElement>('button') ?? [])].filter(
          (b) => b.offsetParent !== null,
        );
        if (!focusables.length) return;
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
  });

  // Pré-carrega as vizinhas para a troca ser instantânea.
  useEffect(() => {
    if (index === null) return;
    [index + 1, index - 1].forEach((i) => {
      const img = new Image();
      img.src = largest(items[(i + count) % count].image);
    });
  }, [index, items, count]);

  const onPointerDown = (e: ReactPointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose();
  };

  const work = index !== null ? items[index] : null;

  return (
    <div
      ref={root}
      className="invisible fixed inset-0 z-[90] flex flex-col overscroll-contain bg-ink/95 opacity-0 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      aria-hidden={!open}
      inert={!open}
    >
      <div data-lightbox-ui className="container-x flex h-20 shrink-0 items-center justify-between">
        <p className="text-sm text-parchment tabular-nums" aria-live="polite">
          {index !== null && (
            <>
              <span className="sr-only">Foto </span>
              {index + 1} / {count}
            </>
          )}
        </p>
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-bone/30 transition-colors hover:border-bone hover:bg-bone hover:text-ink"
          aria-label="Fechar"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-4 select-none lg:px-24"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div ref={frame} className="h-full max-h-full">
          {work && (
            <Picture
              key={work.image}
              image={work.image}
              alt={work.alt}
              sizes="(min-width: 1024px) 70vw, 100vw"
              priority
              className="block h-full bg-transparent!"
              imgClassName="mx-auto h-full w-auto max-w-full object-contain"
            />
          )}
        </div>

        <button
          data-lightbox-ui
          type="button"
          onClick={() => go(-1)}
          className="absolute left-6 hidden h-14 w-14 items-center justify-center rounded-full border border-bone/30 transition-colors hover:border-bone hover:bg-bone hover:text-ink lg:flex"
          aria-label="Foto anterior"
        >
          <ChevronLeft size={22} strokeWidth={1.25} />
        </button>
        <button
          data-lightbox-ui
          type="button"
          onClick={() => go(1)}
          className="absolute right-6 hidden h-14 w-14 items-center justify-center rounded-full border border-bone/30 transition-colors hover:border-bone hover:bg-bone hover:text-ink lg:flex"
          aria-label="Próxima foto"
        >
          <ChevronRight size={22} strokeWidth={1.25} />
        </button>
      </div>

      <div
        data-lightbox-ui
        className="container-x flex shrink-0 items-center justify-between gap-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <p className="font-serif text-xl leading-snug lg:text-2xl">{work?.title}</p>
        <div className="flex gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => go(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-bone/30"
            aria-label="Foto anterior"
          >
            <ChevronLeft size={20} strokeWidth={1.25} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-bone/30"
            aria-label="Próxima foto"
          >
            <ChevronRight size={20} strokeWidth={1.25} />
          </button>
        </div>
      </div>
    </div>
  );
}

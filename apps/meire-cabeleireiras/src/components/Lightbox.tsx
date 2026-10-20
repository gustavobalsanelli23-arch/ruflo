import { useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { business } from '../config/site';
import { type Work, monthYear } from '../data/content';
import { EASE, gsap, lockScroll, prefersReducedMotion, setupGsap } from '../lib/motion';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, CloseIcon } from './icons';
import { Picture, meta } from './Picture';

interface LightboxProps {
  items: Work[];
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
  /** Miniaturas da galeria: a foto ampliada "nasce" de onde foi tocada. */
  origins: RefObject<Map<string, HTMLButtonElement | null>>;
}

const largest = (work: Work) => {
  const { widths } = meta(work.image);
  return `/images/${work.image}-${widths[widths.length - 1]}.webp`;
};

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
      const thumb = origins.current?.get(items[index].image)?.getBoundingClientRect();
      const box = image.getBoundingClientRect();
      if (thumb && !reduce && box.width > 0) {
        gsap.fromTo(
          image,
          {
            x: thumb.left + thumb.width / 2 - (box.left + box.width / 2),
            y: thumb.top + thumb.height / 2 - (box.top + box.height / 2),
            scale: thumb.width / box.width,
          },
          { x: 0, y: 0, scale: 1, duration: 1, ease: EASE.out },
        );
      }
      gsap.fromTo(
        overlay.querySelectorAll('[data-lightbox-ui]'),
        { autoAlpha: 0, y: reduce ? 0 : 10 },
        { autoAlpha: 1, y: 0, duration: 0.7, delay: reduce ? 0 : 0.35, stagger: 0.05 },
      );
      closeBtn.current?.focus({ preventScroll: true });
    } else if (index !== null && was !== null && was !== index) {
      const forward = (index > was && !(was === 0 && index === count - 1)) || (was === count - 1 && index === 0);
      gsap.fromTo(
        image,
        { autoAlpha: 0, x: reduce ? 0 : forward ? 50 : -50 },
        { autoAlpha: 1, x: 0, duration: reduce ? 0 : 0.8, ease: EASE.out },
      );
    } else if (index === null && was !== null) {
      gsap.to(overlay, {
        opacity: 0,
        duration: reduce ? 0 : 0.4,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(overlay, { visibility: 'hidden' });
        },
      });
      lockScroll(false);
    }
  }, [index, count, items, origins]);

  // Teclado: Esc fecha, setas navegam, Tab fica preso dentro do lightbox.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab') {
        const focusables = [...(root.current?.querySelectorAll<HTMLElement>('button, a') ?? [])].filter(
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
    if (index === null || count < 2) return;
    [index + 1, index - 1].forEach((i) => {
      const img = new Image();
      img.src = largest(items[(i + count) % count]);
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
  const roundBtn =
    'flex h-12 w-12 items-center justify-center rounded-full text-papel shadow-[inset_0_0_0_1px_var(--line-light)] transition-colors duration-500 hover:bg-papel hover:text-floresta';

  return (
    <div
      ref={root}
      className="invisible fixed inset-0 z-[90] flex flex-col overscroll-contain bg-floresta text-papel opacity-0"
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      aria-hidden={!open}
      inert={!open}
    >
      <div data-lightbox-ui className="container-x flex h-20 shrink-0 items-center justify-between">
        <p className="text-sm text-champanhe tabular-nums" aria-live="polite">
          {index !== null && (
            <>
              <span className="sr-only">Foto </span>
              {index + 1} / {count}
            </>
          )}
        </p>
        <button ref={closeBtn} type="button" onClick={onClose} className={roundBtn} aria-label="Fechar">
          <CloseIcon size={18} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-4 select-none lg:px-28"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div ref={frame} className="flex h-full max-h-full items-center">
          {work && (
            <Picture
              key={work.image}
              image={work.image}
              alt={work.alt}
              sizes="(min-width: 1024px) 40vw, 100vw"
              priority
              className="block h-full bg-transparent!"
              imgClassName="mx-auto h-full w-auto max-w-full object-contain"
            />
          )}
        </div>

        {count > 1 && (
          <>
            <button
              data-lightbox-ui
              type="button"
              onClick={() => go(-1)}
              className={`absolute left-8 hidden lg:flex ${roundBtn} h-14 w-14`}
              aria-label="Foto anterior"
            >
              <ArrowLeftIcon size={20} />
            </button>
            <button
              data-lightbox-ui
              type="button"
              onClick={() => go(1)}
              className={`absolute right-8 hidden lg:flex ${roundBtn} h-14 w-14`}
              aria-label="Próxima foto"
            >
              <ArrowRightIcon size={20} />
            </button>
          </>
        )}
      </div>

      <div
        data-lightbox-ui
        className="container-x flex shrink-0 flex-wrap items-end justify-between gap-x-8 gap-y-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="min-w-0 max-w-[40rem]">
          <p className="font-serif text-[1.375rem] leading-snug font-light lg:text-[1.75rem]">{work?.title}</p>
          {work && (
            <p className="mt-1 text-[0.875rem] text-champanhe">
              {work.caption ? `“${work.caption}” ` : ''}
              <span className="whitespace-nowrap">Publicado em {monthYear(work.date)}.</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {work && (
            <a
              href={work.post}
              target="_blank"
              rel="noopener noreferrer"
              className="link-line mr-2 text-[0.9375rem] text-papel"
            >
              Ver no Instagram
              <ArrowUpRightIcon size={15} />
              <span className="sr-only">(post de @{business.instagram.handle}, abre em nova aba)</span>
            </a>
          )}
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} className={`${roundBtn} lg:hidden`} aria-label="Foto anterior">
                <ArrowLeftIcon size={18} />
              </button>
              <button type="button" onClick={() => go(1)} className={`${roundBtn} lg:hidden`} aria-label="Próxima foto">
                <ArrowRightIcon size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

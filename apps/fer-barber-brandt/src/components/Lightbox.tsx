import { useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { business } from '../config/site';
import { type Work, monthYear, workTitle } from '../data/content';
import { EASE, gsap, lockScroll, prefersReducedMotion, setupGsap } from '../lib/motion';
import { Picture, largest, ratioOf } from './Picture';

interface LightboxProps {
  items: Work[];
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
  /** Miniaturas da galeria: a foto ampliada "nasce" de onde foi tocada. */
  origins: RefObject<Map<string, HTMLButtonElement | null>>;
}

/** Cabe na área livre sem distorcer: altura limitada pela largura da tela. */
const fit = (ratio: number) => ({ aspectRatio: String(ratio), height: `min(100%, calc((100vw - 2rem) / ${ratio}))` });

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
      gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: reduce ? 0 : 0.45, ease: 'power2.out' });
      const thumb = origins.current?.get(items[index].photo.id)?.getBoundingClientRect();
      const box = image.getBoundingClientRect();
      if (thumb && !reduce && box.width > 0) {
        gsap.fromTo(
          image,
          {
            x: thumb.left + thumb.width / 2 - (box.left + box.width / 2),
            y: thumb.top + thumb.height / 2 - (box.top + box.height / 2),
            scale: thumb.width / box.width,
          },
          { x: 0, y: 0, scale: 1, duration: 1, ease: EASE.out, clearProps: 'transform' },
        );
      }
      gsap.fromTo(
        overlay.querySelectorAll('[data-lightbox-ui]'),
        { autoAlpha: 0, y: reduce ? 0 : 10 },
        { autoAlpha: 1, y: 0, duration: 0.7, delay: reduce ? 0 : 0.3, stagger: 0.05 },
      );
      closeBtn.current?.focus({ preventScroll: true });
    } else if (index !== null && was !== null && was !== index) {
      const forward = (index > was && !(was === 0 && index === count - 1)) || (was === count - 1 && index === 0);
      gsap.fromTo(
        image,
        { autoAlpha: 0, x: reduce ? 0 : forward ? 60 : -60 },
        { autoAlpha: 1, x: 0, duration: reduce ? 0 : 0.8, ease: EASE.out, clearProps: 'transform' },
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
      const src = largest(items[(i + count) % count].photo);
      if (src) new Image().src = src;
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
    'flex h-12 w-12 items-center justify-center text-osso shadow-[inset_0_0_0_1px_var(--line-dark)] transition-colors duration-500 hover:bg-osso hover:text-carvao';

  return (
    <div
      ref={root}
      className="invisible fixed inset-0 z-[90] flex flex-col overscroll-contain bg-carvao text-osso opacity-0"
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      aria-hidden={!open}
      inert={!open}
    >
      <div data-lightbox-ui className="container-x flex h-20 shrink-0 items-center justify-between">
        <p className="label text-fumo tabular-nums" aria-live="polite">
          {index !== null && (
            <>
              <span className="sr-only">Foto </span>
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </>
          )}
        </p>
        <button ref={closeBtn} type="button" onClick={onClose} className={roundBtn} aria-label="Fechar">
          <X size={18} strokeWidth={1.5} aria-hidden="true" />
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
        <div ref={frame} className="flex h-full max-h-full max-w-full items-center justify-center">
          {work && (
            <Picture
              key={work.photo.id}
              slot={work.photo}
              sizes="(min-width: 1024px) 60vw, 100vw"
              priority
              className="block h-full max-h-full max-w-full bg-transparent!"
              imgClassName="mx-auto h-full w-auto max-w-full object-contain"
              style={fit(ratioOf(work.photo))}
              index={String(index! + 1).padStart(2, '0')}
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
              <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button
              data-lightbox-ui
              type="button"
              onClick={() => go(1)}
              className={`absolute right-8 hidden lg:flex ${roundBtn} h-14 w-14`}
              aria-label="Próxima foto"
            >
              <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div
        data-lightbox-ui
        className="container-x flex shrink-0 flex-wrap items-end justify-between gap-x-8 gap-y-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="min-w-0 max-w-[40rem]">
          <p className="text-[1.375rem] leading-tight font-bold uppercase font-stretch-[72%] lg:text-[1.75rem]">
            {work && workTitle(work, index!)}
          </p>
          {work && (work.caption || work.date) && (
            <p className="mt-1 text-[0.875rem] text-fumo">
              {work.caption ? `“${work.caption}” ` : ''}
              {work.date && <span className="whitespace-nowrap">Publicado em {monthYear(work.date)}.</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={work?.post ?? business.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-line label mr-2 text-[0.7rem] text-osso"
          >
            {work?.post ? 'Ver o post' : 'Ver no Instagram'}
            <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">(@{business.instagram.handle}, abre em nova aba)</span>
          </a>
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} className={`${roundBtn} lg:hidden`} aria-label="Foto anterior">
                <ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => go(1)} className={`${roundBtn} lg:hidden`} aria-label="Próxima foto">
                <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

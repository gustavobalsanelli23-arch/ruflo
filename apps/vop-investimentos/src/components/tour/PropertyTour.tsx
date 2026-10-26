import { AnimatePresence, m, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useReducer, useRef, useState, type PointerEvent, type TouchEvent, type WheelEvent } from 'react';
import type { Property } from '../../data/properties';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { FINE_POINTER, useMediaQuery } from '../../hooks/useMediaQuery';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useViewport } from '../../hooks/useViewport';
import { EASE_CINEMA, EASE_OUT, SETTLE } from '../../lib/motion';
import { walkReducer, type Step } from '../../lib/stage';
import { Picture } from '../Picture';
import { Chip } from '../PropertyCard';
import { RoomStage } from './RoomStage';
import { InterestLink, TourPanel } from './TourPanel';

export interface TourTarget {
  property: Property;
  /** Retângulo da foto do card clicado: o percurso se abre a partir dele. */
  origin: DOMRect | null;
}

/** Percurso imersivo pelo imóvel, ambiente por ambiente. */
export function PropertyTour({ target, onClose }: { target: TourTarget | null; onClose: () => void }) {
  return <AnimatePresence>{target && <Tour key={target.property.id} {...target} onClose={onClose} />}</AnimatePresence>;
}

const pad = (n: number) => String(n).padStart(2, '0');

function Tour({ property: p, origin, onClose }: TourTarget & { onClose: () => void }) {
  const reduce = Boolean(useReducedMotion());
  const fine = useMediaQuery(FINE_POINTER);
  const viewport = useViewport();
  const rooms = p.rooms;
  const [walk, dispatch] = useReducer(walkReducer(rooms.length), { index: 0, dir: 1, ended: false });
  const [panel, setPanel] = useState(false);
  const [entered, setEntered] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const lookX = useSpring(0, { stiffness: 50, damping: 18 });
  const lookY = useSpring(0, { stiffness: 50, damping: 18 });
  const room = rooms[walk.index];
  const next = rooms[walk.index + 1];
  const custom = { dir: walk.dir, reduce };

  useScrollLock(true);
  const onEscape = useCallback(() => (panel ? setPanel(false) : onClose()), [panel, onClose]);
  useFocusTrap(root, true, onEscape);

  // Um passo por gesto: a rolagem e o deslize não atropelam a transição.
  const step = useCallback(
    (a: Step) => {
      const now = performance.now();
      if (a.type !== 'jump' && now < lockUntil.current) return;
      lockUntil.current = now + (reduce ? 350 : 1150);
      setEntered(true);
      dispatch(a);
    },
    [reduce],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel || e.altKey || e.metaKey || e.ctrlKey) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        step({ type: 'next' });
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        step({ type: 'prev' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panel, step]);

  const inPanel = (t: EventTarget | null) => Boolean((t as HTMLElement | null)?.closest?.('#ficha-imovel'));
  const onWheel = (e: WheelEvent) => {
    if (inPanel(e.target) || Math.abs(e.deltaY) < 24) return;
    step({ type: e.deltaY > 0 ? 'next' : 'prev' });
  };
  const onTouchStart = (e: TouchEvent) => {
    if (inPanel(e.target)) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    if (Math.abs(d) > 50) step({ type: d < 0 ? 'next' : 'prev' });
  };
  // Olhar ao redor: a imagem desliza um pouco contra o ponteiro.
  const onPointerMove = (e: PointerEvent) => {
    if (!fine || reduce || e.pointerType !== 'mouse') return;
    lookX.set((e.clientX / viewport.width - 0.5) * -30);
    lookY.set((e.clientY / viewport.height - 0.5) * -20);
  };

  // A abertura parte da foto do card (recorte que se expande até a tela toda).
  const [clipFrom] = useState(() => {
    if (!origin) return 'inset(50% 50% 50% 50% round 6px)';
    const { innerWidth: w, innerHeight: h } = window;
    const c = (n: number) => Math.max(0, Math.round(n));
    return `inset(${c(origin.top)}px ${c(w - origin.right)}px ${c(h - origin.bottom)}px ${c(origin.left)}px round 6px)`;
  });
  const opening = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 } }
    : {
        initial: { clipPath: clipFrom },
        animate: { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
        exit: { clipPath: clipFrom, transition: { duration: 0.8, ease: EASE_CINEMA } },
        transition: { duration: 1.05, ease: EASE_CINEMA },
      };

  return (
    <m.div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="percurso-titulo"
      className="fixed inset-0 z-[70] touch-none select-none overflow-hidden bg-night text-linen"
      {...opening}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerMove={onPointerMove}
    >
      <AnimatePresence custom={custom} initial={false}>
        <RoomStage key={`${walk.index}-${room.photo.id}`} room={room} custom={custom} viewport={viewport} lookX={lookX} lookY={lookY} priority={walk.index === 0} />
      </AnimatePresence>
      {next && (
        <div aria-hidden="true" className="pointer-events-none absolute size-px overflow-hidden opacity-0">
          <Picture slot={next.photo} alt="" sizes="100vw" priority />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(180deg,rgb(5_5_5/0.65)_0%,rgb(5_5_5/0)_20%,rgb(5_5_5/0)_52%,rgb(5_5_5/0.9)_100%)]" />

      {/* Barra superior */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <button type="button" onClick={onClose} className="btn btn-glass liquid-glass glass-veil h-11 min-h-0 px-4 text-[0.875rem]">
          <ArrowLeft size={16} strokeWidth={1.6} aria-hidden="true" />
          <span className="hidden sm:inline">Voltar aos imóveis</span>
          <span className="sm:hidden">Voltar</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 sm:flex">
            {p.demo && <Chip tone="demo">Exemplo</Chip>}
            <Chip>{p.code}</Chip>
          </span>
          <button
            type="button"
            onClick={() => setPanel((v) => !v)}
            aria-expanded={panel}
            aria-controls="ficha-imovel"
            className="btn btn-glass liquid-glass glass-veil h-11 min-h-0 px-4 text-[0.875rem]"
          >
            <span>Ficha do imóvel</span>
          </button>
        </div>
      </div>

      {/* Ambiente atual, controles e progresso */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8">
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              {entered ? (
                <m.div
                  key={walk.index}
                  initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', ...SETTLE }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
                  transition={{ duration: reduce ? 0 : 0.7, ease: EASE_OUT, delay: reduce ? 0 : 0.35 }}
                >
                  <p className="text-[0.8125rem] tabular-nums text-linen/70">
                    Ambiente {pad(walk.index + 1)} de {pad(rooms.length)}
                  </p>
                  <p className="display display-lg mt-1 text-shadow-soft">{room.name}</p>
                </m.div>
              ) : (
                <m.div
                  key="entrada"
                  initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', ...SETTLE }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
                  transition={{ duration: reduce ? 0 : 0.8, ease: EASE_OUT, delay: reduce ? 0 : 0.7 }}
                >
                  <p className="text-[0.8125rem] text-linen/75">{p.location.label}</p>
                  <p className="display display-lg mt-1 max-w-[16ch] text-shadow-soft">{p.title}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <button type="button" data-autofocus onClick={() => step({ type: 'next' })} className="btn btn-solid">
                      Entrar no imóvel
                      <ChevronRight className="btn-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
                    </button>
                    <span className="hidden items-center gap-3 text-[0.8125rem] text-linen/70 sm:inline-flex">
                      <span aria-hidden="true" className="relative block h-8 w-px overflow-hidden bg-linen/20">
                        <span className="scroll-cue absolute inset-x-0 top-0 block h-1/3 bg-linen" />
                      </span>
                      ou role, deslize e use as setas
                    </span>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
            <h2 id="percurso-titulo" className="sr-only">
              Percurso pelo imóvel {p.title}, {p.location.label}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => step({ type: 'prev' })}
              disabled={walk.index === 0 && !walk.ended}
              className="liquid-glass glass-veil flex size-12 items-center justify-center rounded-full disabled:opacity-35"
            >
              <span className="sr-only">Ambiente anterior</span>
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => step({ type: 'next' })}
              disabled={walk.ended}
              className="liquid-glass glass-veil flex size-12 items-center justify-center rounded-full disabled:opacity-35"
            >
              <span className="sr-only">{walk.index === rooms.length - 1 ? 'Concluir o percurso' : 'Próximo ambiente'}</span>
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>

        <ol aria-label="Ambientes" className="mt-6 flex gap-2 sm:gap-3">
          {rooms.map((r, i) => (
            <li key={`${i}-${r.name}`} className="flex-1">
              <button
                type="button"
                onClick={() => step({ type: 'jump', to: i })}
                aria-current={i === walk.index && !walk.ended ? 'step' : undefined}
                className="group block w-full py-2 text-left"
              >
                <span className="relative block h-px overflow-hidden bg-linen/25">
                  <span
                    className="absolute inset-0 origin-left bg-champagne transition-transform duration-700 ease-out"
                    style={{ transform: `scaleX(${i <= walk.index ? 1 : 0})` }}
                  />
                </span>
                <span
                  className={[
                    'mt-2 block truncate text-[0.75rem] transition-colors',
                    i === walk.index ? 'text-linen' : 'text-linen/50 group-hover:text-linen/80',
                  ].join(' ')}
                >
                  <span className="hidden sm:inline">{r.name}</span>
                  <span className="sm:hidden">{pad(i + 1)}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <AnimatePresence>
        {walk.ended && (
          <m.div
            className="absolute inset-0 z-20 flex items-center bg-night/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.6 }}
          >
            <m.div
              className="container-x"
              initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', ...SETTLE }}
              transition={{ duration: reduce ? 0 : 0.8, ease: EASE_OUT, delay: reduce ? 0 : 0.2 }}
            >
              <p className="text-[0.875rem] text-linen/70">Fim do percurso</p>
              <p className="display display-xl mt-3">Conheça pessoalmente.</p>
              <p className="lede mt-6">Fale com um especialista da VOP e combine uma visita a este imóvel.</p>
              {p.demo && <p className="mt-4 text-[0.8125rem] text-mineral">Este é um imóvel demonstrativo, com fotos de banco de imagens.</p>}
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <InterestLink property={p} />
                <button type="button" onClick={() => step({ type: 'restart' })} className="btn btn-glass liquid-glass">
                  <RotateCcw size={16} strokeWidth={1.6} aria-hidden="true" />
                  <span>Refazer o percurso</span>
                </button>
                <button type="button" onClick={onClose} className="link-quiet px-2 py-3 text-[0.9375rem]">
                  Ver outros imóveis
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{panel && <TourPanel property={p} onClose={() => setPanel(false)} />}</AnimatePresence>

      <p className="sr-only" aria-live="polite">
        {walk.ended ? 'Fim do percurso' : entered ? `Ambiente ${walk.index + 1} de ${rooms.length}: ${room.name}` : ''}
      </p>
    </m.div>
  );
}

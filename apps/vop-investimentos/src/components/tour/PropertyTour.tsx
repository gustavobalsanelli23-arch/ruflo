import { animate, AnimatePresence, m, useMotionValue, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useReducer, useRef, useState, type TouchEvent, type WheelEvent } from 'react';
import type { Property } from '../../data/properties';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useViewport } from '../../hooks/useViewport';
import { EASE_CINEMA } from '../../lib/motion';
import { cameraTarget, travelTime, walkReducer, type Step } from '../../lib/stage';
import { DecodeText } from '../Decode';
import { MaskLine } from '../MaskLine';
import { Picture } from '../Picture';
import { BackIcon, CtaEdge, DotsIcon, PixelIcon } from '../StratumIcons';
import { Corridor } from './Corridor';
import { EndCard, TourPanel } from './TourPanel';

export interface TourTarget {
  property: Property;
  /** Retângulo da foto do card clicado: o percurso se abre a partir dele (null = do centro). */
  origin: DOMRect | null;
}

/** Percurso 3D pelo imóvel, ambiente por ambiente. */
export function PropertyTour({ target, onClose }: { target: TourTarget | null; onClose: () => void }) {
  return <AnimatePresence>{target && <Tour key={target.property.id} {...target} onClose={onClose} />}</AnimatePresence>;
}

const pad = (n: number) => String(n).padStart(2, '0');

function Tour({ property: p, origin, onClose }: TourTarget & { onClose: () => void }) {
  const reduce = Boolean(useReducedMotion());
  const viewport = useViewport();
  const rooms = p.rooms;
  const [walk, dispatch] = useReducer(walkReducer(rooms.length), { index: 0, dir: 1, ended: false });
  const [panel, setPanel] = useState(false);
  const [entered, setEntered] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  // A câmera começa mais longe e se aproxima enquanto o percurso se abre.
  const cam = useMotionValue(reduce ? -0.85 : -1.7);
  const room = rooms[walk.index];

  useScrollLock(true);
  const onEscape = useCallback(() => (panel ? setPanel(false) : onClose()), [panel, onClose]);
  useFocusTrap(root, true, onEscape);

  useEffect(() => {
    const to = cameraTarget(walk, entered, rooms.length);
    const ctrl = animate(cam, to, reduce ? { duration: 0 } : { duration: travelTime(cam.get(), to), ease: EASE_CINEMA });
    return () => ctrl.stop();
  }, [cam, walk, entered, rooms.length, reduce]);

  // Um passo por gesto: a rolagem e o deslize não atropelam a viagem da câmera.
  // Na entrada, qualquer avanço só entra no imóvel (o 1º ambiente).
  const step = useCallback(
    (a: Step) => {
      const now = performance.now();
      if (a.type !== 'jump' && now < lockUntil.current) return;
      lockUntil.current = now + (reduce ? 350 : 1100);
      if (!entered) {
        if (a.type === 'prev') return;
        setEntered(true);
        if (a.type === 'jump') dispatch(a);
        return;
      }
      dispatch(a);
    },
    [reduce, entered],
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

  // A abertura parte da foto do card (recorte que se expande até a tela toda).
  const [clipFrom] = useState(() => {
    if (!origin) return 'inset(50% 50% 50% 50%)';
    const { innerWidth: w, innerHeight: h } = window;
    const c = (n: number) => Math.max(0, Math.round(n));
    return `inset(${c(origin.top)}px ${c(w - origin.right)}px ${c(h - origin.bottom)}px ${c(origin.left)}px)`;
  });
  const opening = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 } }
    : {
        initial: { clipPath: clipFrom },
        animate: { clipPath: 'inset(0px 0px 0px 0px)' },
        exit: { clipPath: clipFrom, transition: { duration: 0.8, ease: EASE_CINEMA } },
        transition: { duration: 1.05, ease: EASE_CINEMA },
      };
  const atStart = !entered || (walk.index === 0 && !walk.ended);

  return (
    <m.div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="percurso-titulo"
      className="t3-tour fixed inset-0 z-[70] touch-none select-none overflow-hidden text-linen"
      {...opening}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Luz ambiente: a cor do ambiente atual, muito desfocada, atrás do corredor. */}
      <AnimatePresence initial={false}>
        <m.div
          key={walk.index}
          className="t3-ambient"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 1.4 }}
        >
          <Picture slot={room.photo} alt="" sizes="20vw" className="block size-full" imgClassName="size-full object-cover" />
        </m.div>
      </AnimatePresence>

      <Corridor rooms={rooms} cam={cam} current={walk.index} hotspots={entered && !walk.ended} viewport={viewport} reduce={reduce} />
      <div className="t3-vignette" aria-hidden="true" />

      <div className="st-frame t3-frame" aria-hidden="true">
        <span className="ln ln-t" />
        <span className="ln ln-r" />
        <span className="ln ln-b" />
        <span className="ln ln-l" />
        <span className="cn cn-tl" />
        <span className="cn cn-tr" />
        <span className="cn cn-br" />
        <span className="cn cn-bl" />
      </div>

      {/* Barra de cima: voltar, código e ficha. */}
      <div className="t3-top">
        <button type="button" onClick={onClose} className="pill enter lbl" aria-label="Voltar aos imóveis">
          <BackIcon />
          <DecodeText text="VOLTAR" delay={500} />
        </button>
        <div className="flex items-center gap-[calc(8*var(--t))]">
          <span className="t3-code lbl max-sm:!hidden">
            {p.demo && <span className="text-champagne">EXEMPLO&nbsp;·&nbsp;</span>}
            {p.code}
          </span>
          <button
            type="button"
            onClick={() => setPanel((v) => !v)}
            aria-expanded={panel}
            aria-controls="ficha-imovel"
            className="pill menu lbl"
          >
            <DotsIcon />
            <DecodeText text={panel ? 'FECHAR FICHA' : 'FICHA DO IMÓVEL'} delay={560} />
          </button>
        </div>
      </div>

      {/* Ambiente atual (ou a entrada), controles e trilho de ambientes. */}
      <div className="t3-bottom">
        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              {entered ? (
                <m.div key={walk.index} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
                  <p className="lbl text-[rgb(232_238_250/0.6)]">
                    <DecodeText text={`AMBIENTE ${pad(walk.index + 1)} / ${pad(rooms.length)}`} />
                  </p>
                  <p className="display display-lg mt-2">
                    <MaskLine delay={0.5} reduce={reduce}>
                      {room.name}
                    </MaskLine>
                  </p>
                </m.div>
              ) : (
                <m.div key="entrada" exit={{ opacity: 0, transition: { duration: 0.35 } }}>
                  <p className="lbl text-[rgb(232_238_250/0.6)]">
                    <DecodeText text={p.location.label.toUpperCase()} delay={700} />
                  </p>
                  <p className="display display-lg mt-2 max-w-[18ch]">
                    <MaskLine delay={0.75} reduce={reduce}>
                      {p.title}
                    </MaskLine>
                  </p>
                  <div className="mt-[calc(18*var(--t))] flex flex-wrap items-center gap-x-6 gap-y-3">
                    <button type="button" data-autofocus onClick={() => step({ type: 'next' })} className="cta lbl !mt-0">
                      <span className="cta-glass" />
                      <CtaEdge />
                      <span className="cta-in">
                        <PixelIcon />
                        <DecodeText text="ENTRAR NO IMÓVEL" delay={900} />
                      </span>
                    </button>
                    <span className="lbl hidden text-[rgb(232_238_250/0.5)] sm:inline">
                      <DecodeText text="ROLE, DESLIZE OU USE AS SETAS" delay={1000} />
                    </span>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
            <h2 id="percurso-titulo" className="sr-only">
              Percurso pelo imóvel {p.title}, {p.location.label}
            </h2>
          </div>

          {/* Na entrada, no celular, o CTA basta: o título ganha a largura toda. */}
          <div className={['flex shrink-0 items-center gap-[calc(8*var(--t))]', entered ? '' : 'max-sm:!hidden'].join(' ')}>
            <button type="button" onClick={() => step({ type: 'prev' })} disabled={atStart} className="t3-nav">
              <span className="sr-only">Ambiente anterior</span>
              <BackIcon />
            </button>
            <button type="button" onClick={() => step({ type: 'next' })} disabled={walk.ended} className="t3-nav">
              <span className="sr-only">{!entered ? 'Entrar no imóvel' : walk.index === rooms.length - 1 ? 'Concluir o percurso' : 'Próximo ambiente'}</span>
              <BackIcon className="ico rotate-180" />
            </button>
          </div>
        </div>

        <ol aria-label="Ambientes" className="t3-rail">
          {rooms.map((r, i) => {
            const on = entered && i === walk.index && !walk.ended;
            return (
              <li key={`${i}-${r.name}`}>
                <button type="button" onClick={() => step({ type: 'jump', to: i })} aria-current={on ? 'step' : undefined} className="lbl">
                  <span className="t3-rail-line">
                    <span className="t3-rail-fill" style={{ transform: `scaleX(${entered && i <= walk.index ? 1 : 0})` }} />
                  </span>
                  <span className={on ? 'text-linen' : 'text-[rgb(232_238_250/0.42)]'}>
                    <span className="max-sm:hidden">
                      <DecodeText text={`${pad(i + 1)} ${r.name.toUpperCase()}`} delay={1100 + i * 40} />
                    </span>
                    <span className="sm:hidden">{pad(i + 1)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <AnimatePresence>{walk.ended && <EndCard property={p} reduce={reduce} onRestart={() => step({ type: 'restart' })} onClose={onClose} />}</AnimatePresence>
      <AnimatePresence>{panel && <TourPanel property={p} onClose={() => setPanel(false)} />}</AnimatePresence>

      <p className="sr-only" aria-live="polite">
        {walk.ended ? 'Fim do percurso' : entered ? `Ambiente ${walk.index + 1} de ${rooms.length}: ${room.name}` : ''}
      </p>
    </m.div>
  );
}

import { AnimatePresence, m, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useRef, useState, type PointerEvent } from 'react';
import { coverOf, type Property } from '../data/properties';
import { FINE_POINTER, useMediaQuery } from '../hooks/useMediaQuery';
import { formatArea, formatPrice, plural } from '../lib/catalog';
import { EASE_OUT, enter, enterTransition } from '../lib/motion';
import { Picture } from './Picture';

/** Cota de desenho técnico: um traço com marcas nas pontas antes da medida. */
export function Dimension({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={['inline-flex items-center gap-2.5', className].filter(Boolean).join(' ')}>
      <span aria-hidden="true" className="relative block h-px w-7 bg-champagne/70">
        <span className="absolute -top-[3px] left-0 h-[7px] w-px bg-champagne" />
        <span className="absolute -top-[3px] right-0 h-[7px] w-px bg-champagne" />
      </span>
      {children}
    </span>
  );
}

export function Chip({ children, tone = 'glass' }: { children: React.ReactNode; tone?: 'glass' | 'demo' }) {
  return (
    <span
      className={[
        'liquid-glass glass-veil inline-flex h-7 items-center rounded-full px-3 text-[0.75rem] font-medium',
        tone === 'demo' ? 'text-champagne' : 'text-linen/90',
      ].join(' ')}
    >
      {children}
    </span>
  );
}

const purposeLabel = { comprar: 'Comprar', investir: 'Investir' } as const;

interface PropertyCardProps {
  property: Property;
  wide: boolean;
  /** Recebe o retângulo da foto: o percurso se abre a partir dela. */
  onOpen: (property: Property, origin: DOMRect | null) => void;
}

export function PropertyCard({ property: p, wide, onOpen }: PropertyCardProps) {
  const reduce = useReducedMotion();
  const fine = useMediaQuery(FINE_POINTER);
  const interactive = fine && !reduce;
  const titleId = `imovel-${p.id}`;
  const rooms = p.suites ?? p.bedrooms;
  const frame = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  // Inclinação leve da foto e o círculo "Entrar" que segue o ponteiro.
  const tiltX = useSpring(0, { stiffness: 140, damping: 18 });
  const tiltY = useSpring(0, { stiffness: 140, damping: 18 });
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const onMove = (e: PointerEvent) => {
    if (!interactive || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    tiltY.set((px - 0.5) * 5);
    tiltX.set((0.5 - py) * 4);
    cursorX.set(e.clientX - r.left);
    cursorY.set(e.clientY - r.top);
    if (!hover) setHover(true);
  };
  const onLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
    setHover(false);
  };
  return (
    <m.article
      layout={!reduce}
      variants={enter}
      exit={{ opacity: 0, filter: 'blur(6px)', scale: 0.985, transition: { duration: 0.3 } }}
      transition={reduce ? { duration: 0 } : { ...enterTransition, layout: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
      data-reveal
      aria-labelledby={titleId}
      className={['group relative [perspective:1400px]', wide ? 'md:col-span-2' : ''].join(' ')}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <m.div
        ref={frame}
        style={interactive ? { rotateX: tiltX, rotateY: tiltY } : undefined}
        className={[
          'relative overflow-hidden rounded-[6px] bg-graphite',
          wide ? 'aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]' : 'aspect-[4/5] lg:aspect-[5/6]',
        ].join(' ')}
      >
        <Picture
          slot={coverOf(p)}
          sizes={wide ? '(min-width: 768px) 92vw, 100vw' : '(min-width: 768px) 46vw, 100vw'}
          className="block size-full"
          imgClassName="size-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045]"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(5_5_5/0.35)_0%,rgb(5_5_5/0)_30%,rgb(5_5_5/0.1)_55%,rgb(5_5_5/0.85)_100%)]" />

        <div className="absolute inset-x-4 top-4 flex flex-wrap items-start gap-2 sm:inset-x-5 sm:top-5">
          {p.demo && <Chip tone="demo">Exemplo</Chip>}
          <Chip>{p.type}</Chip>
          <span className="ml-auto flex gap-2">
            {p.purposes.map((purpose) => (
              <Chip key={purpose}>{purposeLabel[purpose]}</Chip>
            ))}
          </span>
        </div>

        <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
          <p className="text-[0.8125rem] text-linen/75">{p.location.label}</p>
          <h3 id={titleId} className={['display mt-1.5 text-linen', wide ? 'text-[clamp(1.9rem,1.2rem+2.4vw,3.6rem)]' : 'text-[clamp(1.75rem,1.2rem+1.4vw,2.6rem)]'].join(' ')}>
            {p.title}
          </h3>
        </div>

        {/* Toque: um selo fixo. Mouse: o círculo "Entrar" acompanha o ponteiro. */}
        {!interactive && (
          <span className="liquid-glass glass-veil absolute bottom-4 right-4 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] text-linen sm:bottom-6 sm:right-6">
            Entrar no imóvel
            <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
          </span>
        )}
        <AnimatePresence>
          {interactive && hover && (
            <m.span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-20"
              style={{ x: cursorX, y: cursorY }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <span className="liquid-glass-strong glass-veil -ml-12 -mt-12 flex size-24 flex-col items-center justify-center gap-1 rounded-full text-[0.8125rem] font-medium text-linen">
                Entrar
                <ArrowUpRight size={15} strokeWidth={1.6} />
              </span>
            </m.span>
          )}
        </AnimatePresence>
      </m.div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mt-5">
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.875rem] text-mineral">
          <div>
            <dt className="sr-only">Área</dt>
            <dd>
              <Dimension className="text-linen">{formatArea(p.area)}</Dimension>
            </dd>
          </div>
          {rooms !== undefined && (
            <div>
              <dt className="sr-only">{p.suites !== undefined ? 'Suítes' : 'Dormitórios'}</dt>
              <dd>{p.suites !== undefined ? plural(p.suites, 'suíte', 'suítes') : plural(rooms, 'dormitório', 'dormitórios')}</dd>
            </div>
          )}
          {p.parking !== undefined && (
            <div>
              <dt className="sr-only">Vagas</dt>
              <dd>{plural(p.parking, 'vaga', 'vagas')}</dd>
            </div>
          )}
        </dl>
        <p className="flex items-center gap-3 text-[0.9375rem] text-linen">
          <span>
            {formatPrice(p.price)}
            {p.demo && p.price !== null && <span className="ml-2 text-[0.75rem] text-mineral">valor ilustrativo</span>}
          </span>
          <span
            aria-hidden="true"
            className="liquid-glass flex size-9 items-center justify-center rounded-full transition-colors duration-500 group-hover:bg-linen group-hover:text-night"
          >
            <ArrowUpRight size={16} strokeWidth={1.6} />
          </span>
        </p>
      </div>

      {/* O card inteiro abre o percurso; o nome do imóvel é o rótulo do botão. */}
      <button
        type="button"
        onClick={() => onOpen(p, frame.current?.getBoundingClientRect() ?? null)}
        aria-haspopup="dialog"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-acao`}
        className={['absolute inset-0 z-10 rounded-[6px] focus-visible:outline-offset-8', interactive ? 'cursor-none' : ''].join(' ')}
      >
        <span id={`${titleId}-acao`} className="sr-only">
          Entrar no imóvel
        </span>
      </button>
    </m.article>
  );
}

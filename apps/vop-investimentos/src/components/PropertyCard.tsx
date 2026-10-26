import { AnimatePresence, m, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useRef, useState, type PointerEvent } from 'react';
import { coverOf, type Property } from '../data/properties';
import { FINE_POINTER, useMediaQuery } from '../hooks/useMediaQuery';
import { formatArea, formatPrice, plural } from '../lib/catalog';
import { EASE_MASK, EASE_OUT, EASE_SOFT } from '../lib/motion';
import { DecodeText } from './Decode';
import { Picture } from './Picture';
import { PixelIcon } from './StratumIcons';

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

/** Rótulo curto em Chakra Petch com o canto chanfrado. */
export function Chip({ children, tone = 'glass' }: { children: React.ReactNode; tone?: 'glass' | 'demo' }) {
  return <span className={['chip lbl', tone === 'demo' ? 'chip-demo' : ''].filter(Boolean).join(' ')}>{children}</span>;
}

const purposeLabel = { comprar: 'Comprar', investir: 'Investir' } as const;

interface PropertyCardProps {
  property: Property;
  wide: boolean;
  /** Recebe o retângulo da foto: o percurso se abre a partir dela. */
  onOpen: (property: Property, origin: DOMRect | null) => void;
}

/**
 * Card em camadas 3D: a foto no fundo, a moldura de fio, os rótulos, o
 * título e o selo ENTRAR flutuam a distâncias diferentes à frente dela.
 * Com o mouse, o card inclina e as camadas se deslocam entre si (paralaxe
 * real, não simulada); um brilho segue o ponteiro. Ao entrar na tela, o card
 * se levanta do plano (giro em X).
 */
export function PropertyCard({ property: p, wide, onOpen }: PropertyCardProps) {
  const reduce = useReducedMotion();
  const fine = useMediaQuery(FINE_POINTER);
  const interactive = fine && !reduce;
  const titleId = `imovel-${p.id}`;
  const rooms = p.suites ?? p.bedrooms;
  const frame = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const tiltX = useSpring(0, { stiffness: 120, damping: 16 });
  const tiltY = useSpring(0, { stiffness: 120, damping: 16 });
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${cursorX}px ${cursorY}px, rgb(232 209 203 / 0.16), transparent 60%)`;
  const onMove = (e: PointerEvent) => {
    if (!interactive || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    tiltY.set((px - 0.5) * 9);
    tiltX.set((0.5 - py) * 7);
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
      variants={{
        hidden: { opacity: 0, y: 46, rotateX: reduce ? 0 : 16 },
        visible: { opacity: 1, y: 0, rotateX: 0 },
      }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.3 } }}
      transition={reduce ? { duration: 0 } : { duration: 1.1, ease: EASE_MASK, layout: { duration: 0.6, ease: EASE_SOFT } }}
      style={{ transformPerspective: 1200, transformOrigin: '50% 100%' }}
      data-reveal
      aria-labelledby={titleId}
      className={['card3d group relative', wide ? 'md:col-span-2' : ''].join(' ')}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <m.div
        ref={frame}
        style={interactive ? { rotateX: tiltX, rotateY: tiltY, transformPerspective: 1400 } : undefined}
        className={['card3d-frame relative', wide ? 'aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]' : 'aspect-[4/5] lg:aspect-[5/6]'].join(' ')}
      >
        <span aria-hidden="true" className="card3d-shadow" />
        <div className="card3d-photo cut-frame">
          <Picture
            slot={coverOf(p)}
            sizes={wide ? '(min-width: 768px) 92vw, 100vw' : '(min-width: 768px) 46vw, 100vw'}
            className="block size-full"
            imgClassName="size-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(4_7_13/0.4)_0%,rgb(4_7_13/0)_30%,rgb(4_7_13/0.1)_55%,rgb(4_7_13/0.88)_100%)]" />
          {interactive && <m.div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: glare }} />}
        </div>
        <span aria-hidden="true" className="card3d-edge" />

        <div className="card3d-layer card3d-chips">
          {p.demo && <Chip tone="demo">Exemplo</Chip>}
          <Chip>{p.type}</Chip>
          <span className="ml-auto flex gap-2">
            {p.purposes.map((purpose) => (
              <Chip key={purpose}>{purposeLabel[purpose]}</Chip>
            ))}
          </span>
        </div>

        <div className="card3d-layer card3d-title">
          <p className="lbl text-[rgb(232_238_250/0.72)]">{p.location.label}</p>
          <h3 id={titleId} className={['display mt-2 text-linen', wide ? 'text-[clamp(1.6rem,1rem+2vw,3rem)]' : 'text-[clamp(1.45rem,1rem+1.2vw,2.2rem)]'].join(' ')}>
            {p.title}
          </h3>
          {/* Toque: um selo fixo. Mouse: o selo ENTRAR acompanha o ponteiro, à frente de tudo. */}
          {!interactive && (
            <span className="card3d-badge lbl">
              <PixelIcon />
              Entrar no imóvel
            </span>
          )}
        </div>

        <AnimatePresence>
          {interactive && hover && (
            <m.span
              aria-hidden="true"
              className="card3d-cursor"
              style={{ x: cursorX, y: cursorY, z: 90 }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <span className="card3d-cursor-in lbl">
                <PixelIcon />
                <DecodeText text="ENTRAR" />
              </span>
            </m.span>
          )}
        </AnimatePresence>
      </m.div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
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
          <span aria-hidden="true" className="t3-nav !size-9 !min-h-0 !min-w-0 transition-colors duration-500 group-hover:!bg-champagne group-hover:text-ink">
            <ArrowUpRight size={15} strokeWidth={1.6} />
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
        className={['absolute inset-0 z-10 focus-visible:outline-offset-8', interactive ? 'cursor-none' : ''].join(' ')}
      >
        <span id={`${titleId}-acao`} className="sr-only">
          Entrar no imóvel em 3D
        </span>
      </button>
    </m.article>
  );
}

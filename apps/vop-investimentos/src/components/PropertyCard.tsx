import { m, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Property } from '../data/properties';
import { formatArea, formatPrice, plural } from '../lib/catalog';
import { enter, enterTransition } from '../lib/motion';
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
  onOpen: (property: Property) => void;
}

export function PropertyCard({ property: p, wide, onOpen }: PropertyCardProps) {
  const reduce = useReducedMotion();
  const titleId = `imovel-${p.id}`;
  const rooms = p.suites ?? p.bedrooms;
  return (
    <m.article
      layout={!reduce}
      variants={enter}
      exit={{ opacity: 0, filter: 'blur(6px)', scale: 0.985, transition: { duration: 0.3 } }}
      transition={reduce ? { duration: 0 } : { ...enterTransition, layout: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
      data-reveal
      aria-labelledby={titleId}
      className={['group relative', wide ? 'md:col-span-2' : ''].join(' ')}
    >
      <div
        className={[
          'relative overflow-hidden rounded-[6px] bg-graphite',
          wide ? 'aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]' : 'aspect-[4/5] lg:aspect-[5/6]',
        ].join(' ')}
      >
        <Picture
          slot={p.photos[0]}
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
      </div>

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

      {/* O card inteiro abre o detalhe; o nome do imóvel é o rótulo do botão. */}
      <button
        type="button"
        onClick={() => onOpen(p)}
        aria-haspopup="dialog"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-acao`}
        className="absolute inset-0 z-10 rounded-[6px] focus-visible:outline-offset-8"
      >
        <span id={`${titleId}-acao`} className="sr-only">
          Ver detalhes
        </span>
      </button>
    </m.article>
  );
}

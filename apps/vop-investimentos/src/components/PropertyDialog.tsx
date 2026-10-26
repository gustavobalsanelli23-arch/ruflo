import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveChannel } from '../config/site';
import type { Property } from '../data/properties';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatPrice, interestMessage, specs } from '../lib/catalog';
import { EASE_OUT, SETTLE } from '../lib/motion';
import { Magnetic } from './Magnetic';
import { Picture } from './Picture';
import { Chip, Dimension } from './PropertyCard';

interface PropertyDialogProps {
  property: Property | null;
  onClose: () => void;
}

/** Detalhe do imóvel: galeria com transição entre fotos, ficha e contato. */
export function PropertyDialog({ property, onClose }: PropertyDialogProps) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const open = property !== null;
  useScrollLock(open);
  useFocusTrap(panel, open, onClose);

  return (
    <AnimatePresence>
      {property && (
        <m.div
          key={property.id}
          className="fixed inset-0 z-[60] flex items-stretch justify-center bg-night/75 backdrop-blur-md sm:items-center sm:p-6 lg:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalhe-titulo"
            className="liquid-glass-strong relative flex max-h-[100dvh] w-full max-w-6xl flex-col overflow-y-auto bg-ebony/80 sm:max-h-[min(92dvh,860px)] sm:rounded-[10px] lg:grid lg:h-[min(88dvh,820px)] lg:grid-cols-12 lg:grid-rows-1 lg:overflow-hidden"
            initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', ...SETTLE }}
            exit={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
          >
            <Gallery property={property} />
            <Details property={property} onClose={onClose} />
            <button
              type="button"
              onClick={onClose}
              className="liquid-glass glass-veil absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full text-linen sm:right-4 sm:top-4"
            >
              <span className="sr-only">Fechar detalhes do imóvel</span>
              <X size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function Gallery({ property }: { property: Property }) {
  const reduce = useReducedMotion();
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);
  const count = property.photos.length;
  const go = useCallback((step: number) => setState(([i]) => [(i + step + count) % count, step]), [count]);

  // Setas do teclado trocam a foto (o Esc fica com o diálogo).
  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [count, go]);

  const photo = property.photos[index];
  return (
    <div className="relative shrink-0 lg:col-span-7 lg:h-full lg:min-h-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-night sm:aspect-[16/10] lg:aspect-auto lg:h-full" role="group" aria-roledescription="carrossel" aria-label="Fotos do imóvel">
        <AnimatePresence initial={false} custom={direction}>
          <m.div
            key={photo.id}
            className="absolute inset-0"
            custom={direction}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: 'blur(12px)', x: `${direction * 4}%` }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', x: '0%', ...SETTLE }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, filter: 'blur(8px)', x: `${direction * -3}%` }}
            transition={{ duration: reduce ? 0.2 : 0.9, ease: EASE_OUT }}
            drag={count > 1 && !reduce ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
          >
            <Picture
              slot={photo}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="block size-full"
              imgClassName="pointer-events-none size-full select-none object-cover"
            />
          </m.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,transparent,rgb(5_5_5/0.6))]" />

        {count > 1 && (
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
            <p className="text-[0.8125rem] tabular-nums text-linen/80" aria-live="polite">
              <span className="sr-only">Foto </span>
              {index + 1} / {count}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(-1)} className="liquid-glass glass-veil flex size-11 items-center justify-center rounded-full">
                <span className="sr-only">Foto anterior</span>
                <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => go(1)} className="liquid-glass glass-veil flex size-11 items-center justify-center rounded-full">
                <span className="sr-only">Próxima foto</span>
                <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Details({ property: p, onClose }: { property: Property; onClose: () => void }) {
  const channel = resolveChannel(interestMessage(p));
  return (
    <div className="flex flex-col px-5 pb-8 pt-7 sm:px-8 [&>*]:shrink-0 lg:col-span-5 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:pb-9 lg:pt-10">
      <div className="flex flex-wrap gap-2">
        {p.demo && <Chip tone="demo">Exemplo</Chip>}
        <Chip>{p.type}</Chip>
        <Chip>Código {p.code}</Chip>
      </div>
      <p className="mt-6 text-[0.875rem] text-mineral">{p.location.label}</p>
      <h2 id="detalhe-titulo" className="display display-md mt-2">
        {p.title}
      </h2>
      <p className="mt-4 text-[0.9875rem] leading-relaxed text-linen/80">{p.summary}</p>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-[6px] bg-line">
        {specs(p).map((row) => (
          <div key={row.label} className="bg-ebony px-4 py-3.5">
            <dt className="text-[0.75rem] text-mineral">{row.label}</dt>
            <dd className="mt-1 text-[0.9375rem] text-linen">{row.label === 'Área' ? <Dimension>{row.value}</Dimension> : row.value}</dd>
          </div>
        ))}
        <div className="bg-ebony px-4 py-3.5">
          <dt className="text-[0.75rem] text-mineral">Valor{p.demo && p.price !== null ? ' (ilustrativo)' : ''}</dt>
          <dd className="mt-1 text-[0.9375rem] text-linen">{formatPrice(p.price)}</dd>
        </div>
      </dl>

      {p.features.length > 0 && (
        <ul className="mt-6 space-y-2.5 text-[0.9375rem] text-linen/85">
          {p.features.map((f) => (
            <li key={f} className="flex items-baseline gap-3">
              <span aria-hidden="true" className="relative top-[-3px] block h-px w-3 bg-champagne" />
              {f}
            </li>
          ))}
        </ul>
      )}

      {p.demo && (
        <p className="mt-7 border-l border-champagne/60 pl-4 text-[0.8125rem] leading-relaxed text-mineral">
          Imóvel demonstrativo: as fotos são de banco de imagens e os dados são ilustrativos. Ele mostra como o catálogo da VOP será
          apresentado.
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-7 sm:flex-row">
        <Magnetic className="w-full sm:w-auto">
          <a href={channel.href} target="_blank" rel="noopener noreferrer" className="btn btn-solid w-full sm:w-auto">
            Quero conhecer este imóvel
            <ArrowUpRight className="btn-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
          </a>
        </Magnetic>
        <button type="button" onClick={onClose} className="btn btn-glass liquid-glass">
          <span>Ver outros imóveis</span>
        </button>
      </div>
      {!channel.prefill && (
        <p className="mt-3 text-[0.8125rem] text-mineral">
          Abre o Direct do Instagram. Informe o código {p.code} na conversa.
        </p>
      )}
    </div>
  );
}

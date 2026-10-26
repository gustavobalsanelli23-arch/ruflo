import { m } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { resolveChannel } from '../../config/site';
import type { Property } from '../../data/properties';
import { formatPrice, interestMessage, specs } from '../../lib/catalog';
import { EASE_OUT, SETTLE } from '../../lib/motion';
import { Chip, Dimension } from '../PropertyCard';

/** Contato com a mensagem de interesse pronta (WhatsApp) ou o Direct. */
export function InterestLink({ property, className }: { property: Property; className?: string }) {
  const channel = resolveChannel(interestMessage(property));
  return (
    <a href={channel.href} target="_blank" rel="noopener noreferrer" className={['btn btn-solid', className].filter(Boolean).join(' ')}>
      Quero conhecer este imóvel
      <ArrowUpRight className="btn-icon" size={18} strokeWidth={1.6} aria-hidden="true" />
    </a>
  );
}

/** Ficha do imóvel: painel lateral (desktop) ou folha de baixo (celular). */
export function TourPanel({ property: p, onClose }: { property: Property; onClose: () => void }) {
  const channel = resolveChannel(interestMessage(p));
  return (
    <m.aside
      id="ficha-imovel"
      aria-label="Ficha do imóvel"
      className="liquid-glass-strong absolute inset-x-0 bottom-0 z-30 max-h-[82dvh] overflow-y-auto rounded-t-[18px] bg-ebony/80 px-5 pb-8 pt-6 sm:px-8 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-none md:px-10 md:pt-24"
      initial={{ opacity: 0, x: 0, y: 40, filter: 'blur(8px)' }}
      animate={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)', ...SETTLE }}
      exit={{ opacity: 0, y: 30, filter: 'blur(6px)' }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      <button
        type="button"
        onClick={onClose}
        className="liquid-glass absolute right-4 top-4 flex size-10 items-center justify-center rounded-full md:right-6 md:top-6"
      >
        <span className="sr-only">Fechar a ficha</span>
        <X size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <div className="flex flex-wrap gap-2 pr-12">
        {p.demo && <Chip tone="demo">Exemplo</Chip>}
        <Chip>{p.type}</Chip>
        <Chip>Código {p.code}</Chip>
      </div>
      <p className="mt-6 text-[0.875rem] text-mineral">{p.location.label}</p>
      <h3 className="display display-md mt-2">{p.title}</h3>
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

      <InterestLink property={p} className="mt-8 w-full" />
      {!channel.prefill && <p className="mt-3 text-[0.8125rem] text-mineral">Abre o Direct do Instagram. Informe o código {p.code} na conversa.</p>}
    </m.aside>
  );
}

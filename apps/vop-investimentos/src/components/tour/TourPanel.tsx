import { m } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { resolveChannel } from '../../config/site';
import type { Property } from '../../data/properties';
import { formatPrice, interestMessage, specs } from '../../lib/catalog';
import { EASE_SOFT } from '../../lib/motion';
import { DecodeText } from '../Decode';
import { MaskLine } from '../MaskLine';
import { Chip, Dimension } from '../PropertyCard';
import { CloseIcon } from '../StratumIcons';

/** Contato com a mensagem de interesse pronta (WhatsApp) ou o Direct. */
export function InterestLink({ property, className }: { property: Property; className?: string }) {
  const channel = resolveChannel(interestMessage(property));
  return (
    <a href={channel.href} target="_blank" rel="noopener noreferrer" className={['btn btn-solid', className].filter(Boolean).join(' ')}>
      Quero conhecer este imóvel
      <ArrowUpRight className="btn-icon" size={16} strokeWidth={1.6} aria-hidden="true" />
    </a>
  );
}

/** Ficha do imóvel: painel lateral (desktop) ou folha de baixo (celular), em vidro escuro chanfrado. */
export function TourPanel({ property: p, onClose }: { property: Property; onClose: () => void }) {
  const channel = resolveChannel(interestMessage(p));
  return (
    <m.aside
      id="ficha-imovel"
      aria-label="Ficha do imóvel"
      className="t3-sheet"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 22 }}
      transition={{ duration: 0.5, ease: EASE_SOFT }}
    >
      <button type="button" onClick={onClose} className="t3-nav t3-sheet-close">
        <span className="sr-only">Fechar a ficha</span>
        <CloseIcon />
      </button>

      <div className="flex flex-wrap gap-2 pr-14">
        {p.demo && <Chip tone="demo">Exemplo</Chip>}
        <Chip>{p.type}</Chip>
        <Chip>Código {p.code}</Chip>
      </div>
      <p className="lbl mt-7 text-[rgb(232_238_250/0.55)]">
        <DecodeText text={p.location.label.toUpperCase()} />
      </p>
      <h3 className="display display-md mt-3">{p.title}</h3>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-linen/80">{p.summary}</p>

      <dl className="mt-7 grid grid-cols-2 gap-px bg-line">
        {specs(p).map((row) => (
          <div key={row.label} className="bg-ebony px-4 py-3.5">
            <dt className="kicker">{row.label}</dt>
            <dd className="mt-1.5 text-[0.9375rem] text-linen">{row.label === 'Área' ? <Dimension>{row.value}</Dimension> : row.value}</dd>
          </div>
        ))}
        <div className="bg-ebony px-4 py-3.5">
          <dt className="kicker">Valor{p.demo && p.price !== null ? ' (ilustrativo)' : ''}</dt>
          <dd className="mt-1.5 text-[0.9375rem] text-linen">{formatPrice(p.price)}</dd>
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

interface EndCardProps {
  property: Property;
  reduce: boolean;
  onRestart: () => void;
  onClose: () => void;
}

/** Fim do percurso: a câmera passou do último ambiente e o convite aparece sobre o corredor. */
export function EndCard({ property: p, reduce, onRestart, onClose }: EndCardProps) {
  return (
    <m.div
      className="t3-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.5 }}
    >
      <div className="container-x">
        <p className="lbl text-[rgb(232_238_250/0.6)]">
          <DecodeText text="FIM DO PERCURSO" delay={600} />
        </p>
        <p className="display display-xl mt-4">
          <MaskLine delay={0.7} reduce={reduce}>
            Conheça pessoalmente.
          </MaskLine>
        </p>
        <p className="lede mt-6">Fale com um especialista da VOP e combine uma visita a este imóvel.</p>
        {p.demo && <p className="mt-4 text-[0.8125rem] text-mineral">Este é um imóvel demonstrativo, com fotos de banco de imagens.</p>}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <InterestLink property={p} />
          <button type="button" onClick={onRestart} className="btn btn-glass">
            Refazer o percurso
          </button>
          <button type="button" onClick={onClose} className="link-quiet px-2 py-3 text-[0.9375rem]">
            Ver outros imóveis
          </button>
        </div>
      </div>
    </m.div>
  );
}

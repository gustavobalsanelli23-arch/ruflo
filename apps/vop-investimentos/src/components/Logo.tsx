import { business } from '../config/site';

/**
 * Assinatura tipográfica TEMPORÁRIA: o logotipo oficial da VOP não estava
 * disponível em alta qualidade (Instagram fechado para visitantes). Quando o
 * arquivo chegar, troque este componente por um <svg> do logotipo.
 */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={['inline-flex items-center gap-3 leading-none text-linen', className].filter(Boolean).join(' ')}>
      <span className="font-sans text-[1.32rem] font-semibold tracking-[0.34em]" style={{ marginRight: '-0.34em' }}>
        {business.name}
      </span>
      {!compact && (
        <>
          <span aria-hidden="true" className="h-7 w-px bg-champagne/70" />
          <span className="flex flex-col text-[0.6875rem] font-normal leading-[1.25] tracking-[0.06em] text-mineral">
            <span>Investimentos</span>
            <span>Imobiliários</span>
          </span>
        </>
      )}
    </span>
  );
}

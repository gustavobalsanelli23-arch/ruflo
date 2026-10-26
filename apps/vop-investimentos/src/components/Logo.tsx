import { business } from '../config/site';

/**
 * Assinatura tipográfica TEMPORÁRIA: o logotipo oficial da VOP não estava
 * disponível em alta qualidade (Instagram fechado para visitantes). Quando o
 * arquivo chegar, troque este componente por um <svg> do logotipo.
 */
export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={['inline-flex items-center gap-2.5 leading-none text-linen', className].filter(Boolean).join(' ')}>
      <span className="font-label text-[1.6rem] font-bold tracking-[0.16em]">{business.name}</span>
      {!compact && (
        <span className="border-l border-line pl-2.5 font-label text-[0.5625rem] font-bold uppercase leading-[1.3] tracking-[0.12em] text-[rgb(232_238_250/0.55)]">
          Investimentos
          <br />
          Imobiliários
        </span>
      )}
    </span>
  );
}

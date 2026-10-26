import { business } from '../config/site';
import { VopLockup, VopSymbol, VopWordmark } from './VopMark';

/**
 * Assinatura da VOP. `stacked`: como no perfil (símbolo sobre o "VOP");
 * padrão: símbolo e "VOP" lado a lado, com "Investimentos Imobiliários".
 * O vetor foi redesenhado a partir da foto de perfil (ver VopMark).
 */
export function Logo({ stacked = false, className }: { stacked?: boolean; className?: string }) {
  if (stacked) return <VopLockup title={business.fullName} className={['h-24 w-auto text-linen', className].filter(Boolean).join(' ')} />;
  return (
    <span className={['inline-flex items-center gap-3 leading-none text-linen', className].filter(Boolean).join(' ')}>
      <VopSymbol className="h-10 w-auto" />
      <VopWordmark className="h-[15px] w-auto" />
      <span className="ml-1 border-l border-line pl-3 font-label text-[0.5625rem] font-bold uppercase leading-[1.3] tracking-[0.12em] text-[rgb(232_238_250/0.55)]">
        Investimentos
        <br />
        Imobiliários
      </span>
    </span>
  );
}

import { CreditCard, Lock, PackageSearch, Truck } from 'lucide-react';
import { cn } from '@/lib/format';
import { STEEL_TAG } from './styles';

const ITEMS = [
  { icon: Lock, title: 'Compra segura', text: 'Conexão protegida por HTTPS' },
  { icon: PackageSearch, title: 'Rastreamento do pedido', text: 'Acompanhe cada etapa na sua conta' },
  { icon: Truck, title: 'Frete calculado por CEP', text: 'Valores e prazos simulados até a transportadora ser integrada', tag: 'Simulado' },
  { icon: CreditCard, title: 'Pagamento seguro', text: 'Disponível quando o gateway for integrado', tag: 'Em breve' },
];

/** Garantias da loja numa lista discreta. Sem prometer o que ainda não existe: frete "Simulado", pagamento "Em breve" (também no modo compacto). */
export function TrustBadges({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <ul className={cn('divide-y divide-line', className)}>
      {ITEMS.map(({ icon: Icon, title, text, tag }) => (
        <li key={title} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          <Icon className="mt-px size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.8rem] font-semibold text-fg-2">{title}</span>
            {!compact && <span className="mt-0.5 block text-xs text-muted">{text}</span>}
          </span>
          {tag && <span className={STEEL_TAG}>{tag}</span>}
        </li>
      ))}
    </ul>
  );
}

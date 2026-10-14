import { CreditCard, Lock, PackageSearch, Truck } from 'lucide-react';
import { cn } from '@/lib/format';

const ITEMS = [
  { icon: Lock, title: 'Compra segura', text: 'Conexão protegida por HTTPS' },
  { icon: CreditCard, title: 'Pix e cartão pela Stripe', text: 'Pagamento feito na página segura da Stripe' },
  { icon: Truck, title: 'Frete por região', text: 'Valor e prazo escolhidos na página de pagamento' },
  { icon: PackageSearch, title: 'Rastreamento do pedido', text: 'Acompanhe cada etapa na sua conta' },
];

/** Garantias da loja numa lista discreta (no modo compacto, só os títulos). */
export function TrustBadges({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <ul className={cn('divide-y divide-line', className)}>
      {ITEMS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          <Icon className="mt-px size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[0.8rem] font-semibold text-fg-2">{title}</span>
            {!compact && <span className="mt-0.5 block text-xs text-muted">{text}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

import { CreditCard, Lock, PackageSearch, Truck } from 'lucide-react';
import { cn } from '@/lib/format';

/** Selos de confiança — sem prometer o que ainda não existe (pagamento). */
export function TrustBadges({ className, compact }: { className?: string; compact?: boolean }) {
  const items = [
    { icon: Lock, title: 'Compra segura', text: 'Conexão protegida por HTTPS' },
    { icon: PackageSearch, title: 'Rastreamento do pedido', text: 'Acompanhe cada etapa na sua conta' },
    { icon: Truck, title: 'Envio para todo o Brasil', text: 'Frete calculado pelo CEP' },
    { icon: CreditCard, title: 'Pagamento seguro', text: 'Disponível quando o gateway for integrado', soon: true },
  ];
  return (
    <ul className={cn('grid gap-3', compact ? 'grid-cols-2' : 'sm:grid-cols-2', className)}>
      {items.map(({ icon: Icon, title, text, soon }) => (
        <li key={title} className="flex items-start gap-2.5">
          <Icon className="mt-0.5 size-4 shrink-0 text-brand-400" aria-hidden />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-fg">
              {title}
              {soon && <span className="rounded bg-white/[0.08] px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wider text-muted">Em breve</span>}
            </span>
            {!compact && <span className="block text-[0.7rem] text-muted">{text}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

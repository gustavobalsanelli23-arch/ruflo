'use client';

import { CreditCard, Info } from 'lucide-react';
import type { PaymentLinkGroup } from '@/lib/paymentLinks';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';

/**
 * Última estação: registra o pedido e leva ao pagamento na Stripe (Pix ou
 * cartão). Cada tipo de camisa é pago no seu link, com o frete da região.
 */
export function PaymentStep({ groups, total, placing, onFinalize }: { groups: Omit<PaymentLinkGroup, 'reference'>[]; total: number; placing: boolean; onFinalize(): void }) {
  const several = groups.length > 1;
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-fg-2">
        <Info className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
        <p>
          Você paga na página segura da <b className="font-semibold text-fg">Stripe</b>, com Pix ou cartão. Lá você informa o endereço de entrega e escolhe o frete da sua região.
          {several && <> Seu pedido tem camisas de {groups.length} tipos: são {groups.length} pagamentos, cada um com o seu frete.</>}
        </p>
      </div>

      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
        {groups.map((g) => (
          <li key={g.key} className="flex items-center gap-3 px-4 py-3">
            <CreditCard className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 flex-1 text-sm text-fg">
              {g.label} <span className="text-muted">× {g.quantity}</span>
            </span>
            <span className="text-sm font-semibold tabular-nums text-fg">
              {formatPrice(g.amount)} <span className="font-normal text-muted">+ frete</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Fechamento: o total e a única ação que registra o pedido */}
      <div className="border-t border-line-strong pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-fg-2">Total dos produtos</span>
          <span className="text-3xl font-extrabold tabular-nums text-fg">{formatPrice(total)}</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">O frete é somado na página de pagamento. Ao continuar, o pedido é registrado e o carrinho é esvaziado.</p>
        <Button size="lg" block onClick={onFinalize} loading={placing} className="mt-5">
          {placing ? 'Registrando o pedido…' : 'Finalizar e ir para o pagamento'}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { Barcode, CreditCard, Info, QrCode } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { STEEL_TAG } from './styles';

const METHODS = [
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'cartao', label: 'Cartão de crédito', icon: CreditCard },
  { id: 'boleto', label: 'Boleto', icon: Barcode },
];

/**
 * Última estação: o ponto sem volta. Nenhum gateway está integrado, então os
 * meios aparecem desligados ("Em breve") e o pedido é registrado SEM cobrança.
 */
export function PaymentStep({ total, placing, onFinalize }: { total: number; placing: boolean; onFinalize(): void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-warn/30 bg-warn/[0.06] px-4 py-3 text-sm leading-relaxed text-fg-2">
        <Info className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.75} aria-hidden />
        <p>
          <b className="font-semibold text-fg">Pagamento ainda não integrado.</b> Ao finalizar, seu pedido é registrado sem nenhuma cobrança. Os meios de pagamento serão liberados quando o gateway for conectado.
        </p>
      </div>

      <div role="radiogroup" aria-label="Forma de pagamento" className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
        {METHODS.map(({ id, label, icon: Icon }) => (
          <div key={id} role="radio" aria-checked={false} aria-disabled className="flex items-center gap-3 px-4 py-3">
            <span aria-hidden className="size-[18px] shrink-0 rounded-full border border-line" />
            <Icon className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 flex-1 text-sm text-muted">{label}</span>
            <span className={STEEL_TAG}>Em breve</span>
          </div>
        ))}
      </div>

      {/* Fechamento: o total e a única ação que registra o pedido */}
      <div className="border-t border-line-strong pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-fg-2">Total do pedido</span>
          <span className="text-3xl font-extrabold tabular-nums text-fg">{formatPrice(total)}</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">Ao finalizar, o pedido é registrado e o carrinho é esvaziado.</p>
        <Button size="lg" block onClick={onFinalize} loading={placing} className="mt-5">
          {placing ? 'Finalizando…' : 'Finalizar pedido'}
        </Button>
        <p className="mt-3 text-center text-xs text-muted">Demonstração: nenhuma cobrança será feita.</p>
      </div>
    </div>
  );
}

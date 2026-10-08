'use client';

import { Barcode, CreditCard, Info, QrCode, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const METHODS = [
  { id: 'pix', label: 'Pix', icon: QrCode },
  { id: 'cartao', label: 'Cartão de crédito', icon: CreditCard },
  { id: 'boleto', label: 'Boleto', icon: Barcode },
];

/**
 * Estrutura do pagamento. Nenhum gateway está integrado: os meios aparecem
 * como "em breve" e o pedido é registrado SEM cobrança.
 */
export function PaymentStep({ total, placing, onFinalize }: { total: number; placing: boolean; onFinalize(): void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-fg-2">
        <Info className="mt-0.5 size-4 shrink-0 text-warn" />
        <p>
          <b className="text-fg">Pagamento ainda não integrado.</b> Ao finalizar, seu pedido é registrado sem nenhuma cobrança. Os meios de pagamento serão liberados quando o gateway for conectado.
        </p>
      </div>
      <div role="radiogroup" aria-label="Forma de pagamento" className="grid gap-3 sm:grid-cols-3">
        {METHODS.map(({ id, label, icon: Icon }) => (
          <div key={id} role="radio" aria-checked={false} aria-disabled className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-4 opacity-60 ring-1 ring-white/[0.08]">
            <Icon className="size-5 text-fg-2" />
            <span className="flex-1 text-sm font-semibold text-fg-2">{label}</span>
            <span className="rounded bg-white/[0.08] px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wider text-muted">Em breve</span>
          </div>
        ))}
      </div>
      <div className="flex items-baseline justify-between rounded-xl bg-white/[0.03] px-4 py-3">
        <span className="text-sm text-fg-2">Total do pedido</span>
        <span className="text-2xl font-extrabold tabular-nums text-fg">{formatPrice(total)}</span>
      </div>
      <Button size="lg" block onClick={onFinalize} loading={placing}>
        {!placing && <ShieldCheck className="size-4" />} {placing ? 'Finalizando…' : 'Finalizar pedido'}
      </Button>
      <p className="text-center text-xs text-muted">Demonstração: nenhuma cobrança será feita.</p>
    </div>
  );
}

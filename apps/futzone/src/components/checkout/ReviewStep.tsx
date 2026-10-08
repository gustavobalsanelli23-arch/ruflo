'use client';

import { AlertTriangle, MapPin, Truck } from 'lucide-react';
import type { Address } from '@/types/commerce';
import type { CartLine } from '@/lib/cart';
import type { ShippingOption } from '@/services/shipping/shipping.types';
import type { StockIssue } from '@/services/inventory.service';
import { STOCK_ISSUE_MESSAGE } from '@/services/inventory.service';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { formatAddress } from '@/lib/orders';
import { formatPrice } from '@/lib/format';
import { Button, LinkButton } from '@/components/ui/Button';

interface Props {
  lines: CartLine[];
  address: Address;
  shipping: ShippingOption;
  issues: StockIssue[];
  totalsSlot: React.ReactNode;
  /** Campo de cupom — no celular o resumo lateral fica recolhido. */
  couponSlot?: React.ReactNode;
  onEdit(step: 2 | 3): void;
  onContinue(): void;
}

/** Revisão completa antes do pagamento. */
export function ReviewStep({ lines, address, shipping, issues, totalsSlot, couponSlot, onEdit, onContinue }: Props) {
  return (
    <div className="space-y-6">
      {issues.length > 0 && (
        <div role="alert" className="space-y-2 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-danger"><AlertTriangle className="size-4" /> Revise seu carrinho</p>
          <ul className="space-y-1 text-fg-2">
            {issues.map((i) => (
              <li key={i.productId + i.size}>
                {i.name} ({i.size}): {i.kind === 'indisponivel' ? STOCK_ISSUE_MESSAGE.indisponivel : `restam ${i.available} unidade(s).`}
              </li>
            ))}
          </ul>
          <LinkButton href="/carrinho" size="sm" variant="secondary">Ajustar carrinho</LinkButton>
        </div>
      )}

      <ul className="divide-y divide-white/[0.06]">
        {lines.map((l) => (
          <li key={l.productId + l.size} className="flex items-center gap-3 py-3 first:pt-0">
            {l.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.image} alt="" width={720} height={960} loading="lazy" decoding="async" className="h-16 w-12 shrink-0 rounded-lg bg-surface-2 object-cover" />
            ) : (
              <span className="h-16 w-12 shrink-0 rounded-lg bg-surface-2" />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-fg">{l.name}</p>
              <p className="text-xs text-muted">Tamanho {l.size} · {l.quantity} × {formatPrice(l.unitPrice)}</p>
            </div>
            <p className="text-sm font-bold tabular-nums">{formatPrice(l.subtotal)}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/[0.03] p-4 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><MapPin className="size-3.5 text-brand-400" /> Endereço</p>
            <button type="button" onClick={() => onEdit(2)} className="text-xs font-semibold text-brand-300 hover:underline">Alterar</button>
          </div>
          <p className="font-semibold text-fg">{address.recipient}</p>
          <p className="text-fg-2">{formatAddress(address)}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><Truck className="size-3.5 text-brand-400" /> Entrega</p>
            <button type="button" onClick={() => onEdit(3)} className="text-xs font-semibold text-brand-300 hover:underline">Alterar</button>
          </div>
          <p className="font-semibold text-fg">{shipping.name} · {shipping.isFree ? 'Grátis' : formatPrice(shipping.price)}</p>
          <p className="text-fg-2">{formatBusinessDays(shipping.minDays, shipping.maxDays)}</p>
          <p className="text-xs text-muted">Entrega estimada {formatDeliveryWindow(shipping.estimate.from, shipping.estimate.to)}</p>
        </div>
      </div>

      {couponSlot && <div className="lg:hidden">{couponSlot}</div>}
      <div className="rounded-xl bg-white/[0.03] p-4">{totalsSlot}</div>

      <Button size="lg" block className="sm:w-auto" onClick={onContinue} disabled={issues.length > 0}>
        Continuar
      </Button>
    </div>
  );
}

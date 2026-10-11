'use client';

import { AlertTriangle } from 'lucide-react';
import type { Address } from '@/types/commerce';
import type { CartLine } from '@/lib/cart';
import type { ShippingOption } from '@/services/shipping/shipping.types';
import type { StockIssue } from '@/services/inventory.service';
import { STOCK_ISSUE_MESSAGE } from '@/services/inventory.service';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { cn, formatPrice } from '@/lib/format';
import { Button, LinkButton } from '@/components/ui/Button';
import { addressLines } from './addressLines';
import { OrderLines } from './OrderSummary';
import { TEXT_BUTTON } from './styles';

interface Props {
  lines: CartLine[];
  address: Address;
  shipping: ShippingOption;
  issues: StockIssue[];
  totalsSlot: React.ReactNode;
  /** Campo de cupom: no celular o resumo lateral fica recolhido. */
  couponSlot?: React.ReactNode;
  onEdit(step: 2 | 3): void;
  onContinue(): void;
}

/** Revisão completa antes do pagamento: itens, endereço, entrega e totais. */
export function ReviewStep({ lines, address, shipping, issues, totalsSlot, couponSlot, onEdit, onContinue }: Props) {
  return (
    <div className="space-y-6">
      {issues.length > 0 && (
        <div role="alert" className="space-y-2 rounded-[var(--radius-card)] border border-danger/30 bg-danger/[0.06] p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-danger">
            <AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden /> Revise seu carrinho
          </p>
          <ul className="space-y-1 text-fg-2">
            {issues.map((i) => (
              <li key={i.productId + i.size}>
                {i.name} ({i.size}): {i.kind === 'indisponivel' ? STOCK_ISSUE_MESSAGE.indisponivel : `restam ${i.available} ${i.available === 1 ? 'unidade' : 'unidades'}.`}
              </li>
            ))}
          </ul>
          <LinkButton href="/carrinho" size="sm" variant="secondary">
            Ajustar carrinho
          </LinkButton>
        </div>
      )}

      <OrderLines lines={lines} />

      {/* Endereço e entrega lado a lado, separados por uma junta de 1px */}
      <div className="grid border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-line">
        <div className="py-4 sm:pr-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-fg">Endereço</h3>
            <button type="button" onClick={() => onEdit(2)} className={cn(TEXT_BUTTON, '-my-1.5 -mr-1')}>
              Alterar
            </button>
          </div>
          <p className="mt-1.5 text-sm text-fg">{address.recipient}</p>
          <p className="text-sm leading-relaxed text-fg-2">
            {addressLines(address).map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
        </div>
        <div className="border-t border-line py-4 sm:border-t-0 sm:pl-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-fg">Entrega</h3>
            <button type="button" onClick={() => onEdit(3)} className={cn(TEXT_BUTTON, '-my-1.5 -mr-1')}>
              Alterar
            </button>
          </div>
          <p className="mt-1.5 text-sm text-fg">
            {shipping.name}, <span className="tabular-nums">{shipping.isFree ? 'Grátis' : formatPrice(shipping.price)}</span>
          </p>
          <p className="text-sm text-fg-2">{formatBusinessDays(shipping.minDays, shipping.maxDays)}</p>
          <p className="text-xs leading-relaxed text-muted">Entrega estimada {formatDeliveryWindow(shipping.estimate.from, shipping.estimate.to)}</p>
          {shipping.isMock && <p className="mt-1 text-xs text-muted">Valor e prazo simulados.</p>}
        </div>
      </div>

      {couponSlot && <div className="lg:hidden">{couponSlot}</div>}
      {totalsSlot}

      <Button size="lg" block className="sm:w-auto" onClick={onContinue} disabled={issues.length > 0}>
        Continuar
      </Button>
    </div>
  );
}

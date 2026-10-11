'use client';

import { useId, useState } from 'react';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import type { CartLine } from '@/lib/cart';
import { cn, formatPrice } from '@/lib/format';
import { LineThumb } from '@/components/cart/CartLine';
import { TrustBadges } from './TrustBadges';

interface Props {
  lines: CartLine[];
  total: number;
  totalsSlot: React.ReactNode;
  couponSlot: React.ReactNode;
}

/** Itens do pedido: foto no nicho, nome, tamanho, quantidade e subtotal. */
export function OrderLines({ lines, className }: { lines: CartLine[]; className?: string }) {
  return (
    <ul className={cn('divide-y divide-line', className)}>
      {lines.map((l) => (
        <li key={l.productId + l.size} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <LineThumb line={l} size="xs" className="border border-line" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-fg">{l.name}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-xs text-muted">
              <span>
                Tamanho <span className="plate text-[0.8rem] text-fg-2">{l.size}</span>
              </span>
              <span className="tabular-nums">
                {l.quantity} × {formatPrice(l.unitPrice)}
              </span>
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold tabular-nums text-fg">{formatPrice(l.subtotal)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Resumo lateral (desktop): armário aceso com os itens, o cupom e os totais. */
export function OrderSummary({ lines, totalsSlot, couponSlot }: Props) {
  return (
    <div className="locker relative rounded-[var(--radius-card)]">
      <span aria-hidden className="pointer-events-none absolute inset-x-[14%] top-0 h-px bg-light/60" />
      <div className="flex h-11 items-center border-b border-line px-5">
        <h2 className="plate text-[1.05rem] leading-[1.25] text-fg">Resumo do pedido</h2>
      </div>
      <div className="space-y-5 p-5">
        <OrderLines lines={lines} className="max-h-72 overflow-y-auto overscroll-contain pr-1" />
        <div className="border-t border-line pt-4">{couponSlot}</div>
        {totalsSlot}
        <TrustBadges compact className="border-t border-line pt-4" />
      </div>
    </div>
  );
}

/**
 * Resumo recolhível (celular). Recolhido, o painel fica `inert` numa linha de
 * grade 0fr (não some do DOM: o cupom guarda o próprio estado). A altura muda
 * sem animar; o conteúdo só aparece em fade.
 */
export function MobileOrderSummary({ lines, total, totalsSlot, couponSlot }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="locker mb-6 rounded-[var(--radius-card)] lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-12 w-full items-center gap-3 rounded-[var(--radius-card)] px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
      >
        <ShoppingBag className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-sm font-semibold text-fg">{open ? 'Ocultar resumo' : 'Ver resumo do pedido'}</span>
        <span className="font-extrabold tabular-nums text-fg">{formatPrice(total)}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted transition-transform duration-200 ease-[var(--ease-out-fz)] motion-reduce:transition-none', open && 'rotate-180')}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
      <div id={panelId} className={cn('grid', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')} inert={!open}>
        <div className="min-h-0 overflow-hidden">
          <div className={cn('space-y-5 border-t border-line p-4 transition-opacity duration-200 ease-[var(--ease-out-fz)]', open ? 'opacity-100' : 'opacity-0')}>
            <OrderLines lines={lines} />
            {couponSlot}
            {totalsSlot}
          </div>
        </div>
      </div>
    </div>
  );
}

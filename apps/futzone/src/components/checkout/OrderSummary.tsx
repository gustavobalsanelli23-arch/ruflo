'use client';

import { useState } from 'react';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import type { CartLine } from '@/lib/cart';
import { cn, formatPrice } from '@/lib/format';
import { TrustBadges } from './TrustBadges';

interface Props {
  lines: CartLine[];
  total: number;
  totalsSlot: React.ReactNode;
  couponSlot: React.ReactNode;
}

function Lines({ lines }: { lines: CartLine[] }) {
  return (
    <ul className="max-h-72 space-y-3 overflow-y-auto overscroll-contain pr-1">
      {lines.map((l) => (
        <li key={l.productId + l.size} className="flex items-center gap-3">
          <span className="relative shrink-0">
            {l.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.image} alt="" width={720} height={960} loading="lazy" decoding="async" className="h-14 w-11 rounded-lg bg-surface-2 object-cover" />
            ) : (
              <span className="block h-14 w-11 rounded-lg bg-surface-2" />
            )}
            <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[0.62rem] font-bold leading-5 text-white">{l.quantity}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm text-fg">{l.name}</span>
            <span className="text-xs text-muted">Tamanho {l.size}</span>
          </span>
          <span className="text-sm font-semibold tabular-nums">{formatPrice(l.subtotal)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Resumo lateral (desktop). */
export function OrderSummary({ lines, totalsSlot, couponSlot }: Props) {
  return (
    <div className="space-y-5 rounded-3xl bg-surface p-6 ring-1 ring-white/[0.06]">
      <h2 className="heading-display text-3xl">Resumo do pedido</h2>
      <Lines lines={lines} />
      <div className="border-t border-white/[0.06] pt-5">{couponSlot}</div>
      {totalsSlot}
      <TrustBadges className="border-t border-white/[0.06] pt-5" />
    </div>
  );
}

/** Resumo expansível (celular). */
export function MobileOrderSummary({ lines, total, totalsSlot, couponSlot }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5 overflow-hidden rounded-2xl bg-surface ring-1 ring-white/[0.06] lg:hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <ShoppingBag className="size-4 text-brand-400" />
        <span className="flex-1 text-sm font-semibold text-fg">{open ? 'Ocultar resumo' : 'Ver resumo do pedido'}</span>
        <span key={total} className="animate-pop font-extrabold tabular-nums text-fg">{formatPrice(total)}</span>
        <ChevronDown className={cn('size-4 text-muted transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-fz)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')} inert={!open}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-5 border-t border-white/[0.06] p-4">
            <Lines lines={lines} />
            {couponSlot}
            {totalsSlot}
          </div>
        </div>
      </div>
    </div>
  );
}

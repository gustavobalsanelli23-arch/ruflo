'use client';

import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { couponLabel, type CouponResult } from '@/services/coupons/coupon.service';
import type { OrderTotals } from '@/lib/orders';
import type { ShippingOption } from '@/services/shipping/shipping.types';
import { cn, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { TEXT_BUTTON } from './styles';

/** Produtos, promoções, subtotal, frete, desconto e total (algarismos tabulares). */
export function TotalsTable({
  totals,
  itemCount,
  shipping,
  couponCode,
  couponResult,
}: {
  totals: OrderTotals;
  itemCount: number;
  shipping: ShippingOption | null;
  couponCode: string | null;
  couponResult: CouponResult | null;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4 text-fg-2">
        <dt>
          Produtos ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
        </dt>
        <dd className="tabular-nums">{formatPrice(totals.products)}</dd>
      </div>
      {totals.promoSavings > 0 && (
        <div className="flex justify-between gap-4 text-success">
          <dt>Promoções</dt>
          <dd className="tabular-nums">− {formatPrice(totals.promoSavings)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4 text-fg-2">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4 text-fg-2">
        <dt>Frete{shipping ? ` (${shipping.name})` : ''}</dt>
        <dd className={cn('tabular-nums', shipping?.isFree && 'text-success')}>
          {!shipping ? <span className="text-muted">A calcular</span> : shipping.isFree ? 'Grátis' : formatPrice(shipping.price)}
        </dd>
      </div>
      {couponCode && couponResult?.ok && (
        <div className="animate-fade flex justify-between gap-4 text-success">
          <dt>Desconto ({couponCode})</dt>
          <dd className="tabular-nums">{couponResult.freeShipping && !shipping ? 'Frete grátis' : `− ${formatPrice(totals.discount)}`}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <dt className="font-semibold text-fg">Total</dt>
        <dd className="text-2xl font-extrabold tabular-nums text-fg">{formatPrice(totals.total)}</dd>
      </div>
    </dl>
  );
}

/** "Tem um cupom?": aplicar e remover, com mensagens claras. Cada cópia guarda o próprio estado. */
export function CouponField({ code, result, onApply, onRemove }: { code: string | null; result: CouponResult | null; onApply(code: string): Promise<CouponResult>; onRemove(): void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (code) {
    return result?.ok ? (
      <div className="animate-fade flex items-center gap-3 rounded-[var(--radius-chip)] border border-success/30 bg-success/[0.07] py-1 pl-3 pr-1 text-sm text-success">
        <Tag className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1">
          <b className="font-semibold">{code}</b> aplicado: {couponLabel(result.coupon)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover cupom ${code}`}
          className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-button)] transition-[background-color,transform,scale] duration-150 ease-[var(--ease-out-fz)] hover:bg-success/15 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-3 rounded-[var(--radius-chip)] border border-warn/30 bg-warn/[0.07] py-1 pl-3 pr-1 text-xs text-warn">
        <Tag className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1">
          Cupom {code} não aplicado: {result && !result.ok ? result.message : ''}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 shrink-0 items-center rounded-[var(--radius-button)] px-2 font-bold underline decoration-warn/40 underline-offset-2 transition-[text-decoration-color] duration-150 hover:decoration-warn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          Remover
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(TEXT_BUTTON, '-ml-1')}>
        <Tag className="size-4 text-muted" strokeWidth={1.75} aria-hidden /> Tem um cupom?
      </button>
    );
  }

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await onApply(value);
    setLoading(false);
    if (!r.ok) setError(r.message);
    else setValue('');
  };

  return (
    <form onSubmit={apply} noValidate className="animate-fade">
      <Field label="Cupom de desconto" error={error ?? undefined}>
        {(id, describedBy) => (
          <div className="flex gap-2">
            <Input
              id={id}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              placeholder="Ex.: CUPOM10"
              autoCapitalize="characters"
              autoComplete="off"
              className={cn('h-10 uppercase', error && 'animate-shake')}
              aria-invalid={!!error}
              aria-describedby={describedBy}
            />
            <Button type="submit" size="sm" variant="secondary" className="h-10 shrink-0" loading={loading}>
              Aplicar
            </Button>
          </div>
        )}
      </Field>
    </form>
  );
}

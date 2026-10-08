'use client';

import { useId, useState } from 'react';
import { Tag, X } from 'lucide-react';
import { couponLabel, type CouponResult } from '@/services/coupons/coupon.service';
import type { OrderTotals } from '@/lib/orders';
import type { ShippingOption } from '@/services/shipping/shipping.types';
import { cn, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';

/** Produtos · Subtotal · Frete · Desconto · Total. */
export function TotalsTable({ totals, itemCount, shipping, couponCode, couponResult }: { totals: OrderTotals; itemCount: number; shipping: ShippingOption | null; couponCode: string | null; couponResult: CouponResult | null }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-fg-2">
        <dt>Produtos ({itemCount} {itemCount === 1 ? 'item' : 'itens'})</dt>
        <dd className="tabular-nums">{formatPrice(totals.products)}</dd>
      </div>
      {totals.promoSavings > 0 && (
        <div className="flex justify-between text-success">
          <dt>Promoções</dt>
          <dd className="tabular-nums">− {formatPrice(totals.promoSavings)}</dd>
        </div>
      )}
      <div className="flex justify-between text-fg-2">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
      </div>
      <div className="flex justify-between text-fg-2">
        <dt>Frete{shipping ? ` · ${shipping.name}` : ''}</dt>
        <dd key={shipping?.id ?? 'none'} className={cn('animate-fade tabular-nums', shipping?.isFree && 'text-success')}>
          {!shipping ? <span className="text-muted">A calcular</span> : shipping.isFree ? 'Grátis' : formatPrice(shipping.price)}
        </dd>
      </div>
      {couponCode && couponResult?.ok && (
        <div className="flex justify-between text-success">
          <dt>Desconto ({couponCode})</dt>
          <dd key={totals.discount} className="animate-pop tabular-nums">{couponResult.freeShipping && !shipping ? 'Frete grátis' : `− ${formatPrice(totals.discount)}`}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-3">
        <dt className="font-bold text-fg">Total</dt>
        <dd key={totals.total} className="animate-pop text-2xl font-extrabold tabular-nums text-fg">{formatPrice(totals.total)}</dd>
      </div>
    </dl>
  );
}

/** "Tem um cupom?" — aplicar / remover, com mensagens claras. */
export function CouponField({ code, result, onApply, onRemove }: { code: string | null; result: CouponResult | null; onApply(code: string): Promise<CouponResult>; onRemove(): void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  if (code) {
    return result?.ok ? (
      <div className="animate-pop flex items-center gap-3 rounded-xl bg-success/10 px-3 py-2.5 text-sm text-success">
        <Tag className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <b>{code}</b> aplicado · {couponLabel(result.coupon)}
        </span>
        <button type="button" onClick={onRemove} className="grid size-7 place-items-center rounded-md hover:bg-success/15" aria-label={`Remover cupom ${code}`}>
          <X className="size-4" />
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-3 rounded-xl bg-warn/10 px-3 py-2.5 text-xs text-warn">
        <Tag className="size-4 shrink-0" />
        <span className="flex-1">Cupom {code} não aplicado: {result && !result.ok ? result.message : ''}</span>
        <button type="button" onClick={onRemove} className="font-bold hover:underline">Remover</button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-brand-300 hover:underline">
        <Tag className="size-4" /> Tem um cupom?
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
    <form onSubmit={apply} noValidate className="animate-fade-up">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-fg-2">Cupom de desconto</label>
      <div className="flex gap-2">
        <Input id={id} value={value} onChange={(e) => setValue(e.target.value.toUpperCase())} placeholder="Ex.: CUPOM10" autoCapitalize="characters" className={cn('h-10 uppercase', error && 'animate-shake')} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
        <Button type="submit" size="sm" variant="secondary" className="h-10 shrink-0" loading={loading}>Aplicar</Button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">{error}</p>}
    </form>
  );
}

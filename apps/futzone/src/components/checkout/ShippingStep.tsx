'use client';

import { Check, Info, RotateCcw, Truck } from 'lucide-react';
import type { Address } from '@/types/commerce';
import type { ShippingQuote } from '@/services/shipping/shipping.types';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { cn, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  address: Address;
  quote: ShippingQuote | null;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect(id: string): void;
  onRetry(): void;
  onContinue(): void;
}

/** "Entrega": opções do provedor de frete com prazo e data estimada. */
export function ShippingStep({ address, quote, loading, error, selectedId, onSelect, onRetry, onContinue }: Props) {
  const free = quote?.freeShipping;
  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 text-sm text-fg-2">
        <Truck className="mt-0.5 size-4 shrink-0 text-brand-400" />
        <span>
          Enviando para <b className="text-fg">CEP {address.zip}</b> — {address.city}/{address.state}
        </span>
      </p>

      {loading && (
        <div className="space-y-3" role="status" aria-label="Calculando frete">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm">
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="secondary" onClick={onRetry}><RotateCcw className="size-3.5" /> Tentar de novo</Button>
        </div>
      )}

      {!loading && quote && (
        <>
          {free?.enabled && !free.applied && free.remaining > 0 && (
            <p className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
              Faltam <b>{formatPrice(free.remaining)}</b> para ganhar frete grátis.
            </p>
          )}
          <div role="radiogroup" aria-label="Opções de entrega" className="space-y-3">
            {quote.options.map((o) => {
              const selected = o.id === selectedId;
              return (
                <label
                  key={o.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-4 rounded-2xl p-4 ring-1 transition-[box-shadow,background-color,transform] duration-200 active:scale-[0.99]',
                    selected ? 'bg-brand-500/[0.06] ring-2 ring-brand-500' : 'bg-white/[0.02] ring-white/[0.08] hover:ring-white/20',
                  )}
                >
                  <input type="radio" name="frete" className="sr-only" checked={selected} onChange={() => onSelect(o.id)} />
                  <span className={cn('grid size-5 shrink-0 place-items-center rounded-full ring-2 transition-colors', selected ? 'bg-brand-500 ring-brand-500' : 'ring-white/25')} aria-hidden>
                    {selected && <Check className="animate-pop size-3 text-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-fg">
                      {o.name} <span className="text-xs font-normal text-muted">· {o.carrier}</span>
                    </span>
                    <span className="block text-xs text-fg-2">{formatBusinessDays(o.minDays, o.maxDays)}</span>
                    <span className="block text-xs text-muted">Entrega estimada {formatDeliveryWindow(o.estimate.from, o.estimate.to)}</span>
                  </span>
                  <span className="text-right">
                    {o.isFree ? (
                      <>
                        <span className="block font-bold text-success">Grátis</span>
                        <span className="text-xs text-muted line-through">{formatPrice(o.originalPrice)}</span>
                      </>
                    ) : (
                      <span className="font-bold tabular-nums text-fg">{formatPrice(o.price)}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          {quote.isMock && (
            <p className="flex items-start gap-2 text-xs text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" /> Valores e prazos simulados: nenhuma transportadora está conectada ainda. A estimativa considera apenas dias úteis.
            </p>
          )}
          <Button size="lg" block className="sm:w-auto" disabled={!selectedId} onClick={onContinue}>
            Continuar
          </Button>
        </>
      )}
    </div>
  );
}

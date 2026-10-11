'use client';

import { AlertTriangle, Info, RotateCcw, Truck } from 'lucide-react';
import type { Address } from '@/types/commerce';
import type { ShippingQuote } from '@/services/shipping/shipping.types';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { cn, formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { STEEL_TAG } from './styles';

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
        <Truck className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
        <span>
          Enviando para <b className="font-semibold text-fg">CEP {address.zip}</b>, {address.city}/{address.state}
        </span>
      </p>

      {loading && (
        <div role="status" aria-label="Calculando frete" className="divide-y divide-line rounded-[var(--radius-card)] border border-line-strong">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="size-[18px] shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/3 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
              </div>
              <Skeleton className="h-4 w-16 rounded-sm" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-fg-2">
          <AlertTriangle className="size-4 shrink-0 text-danger" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0 flex-1">{error}</span>
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden /> Tentar de novo
          </Button>
        </div>
      )}

      {!loading && quote && (
        <>
          {free?.enabled && !free.applied && free.remaining > 0 && (
            <p className="text-sm text-fg-2">
              Faltam <b className="font-semibold tabular-nums text-fg">{formatPrice(free.remaining)}</b> para ganhar frete grátis.
            </p>
          )}

          <div>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-fg">Opções de frete</p>
              {quote.isMock && <span className={STEEL_TAG}>Simulado</span>}
            </div>
            <div role="radiogroup" aria-label="Opções de entrega" className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line-strong">
              {quote.options.map((o) => {
                const selected = o.id === selectedId;
                return (
                  <label
                    key={o.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-[background-color,box-shadow] duration-150 ease-[var(--ease-out-fz)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-brand-400',
                      // Selecionada: o mesmo aço com borda azul dos endereços (AddressCard)
                      selected ? 'bg-steel-3 ring-1 ring-inset ring-brand-500' : 'hover:bg-steel-2 active:bg-steel-3',
                    )}
                  >
                    <input type="radio" name="frete" className="sr-only" checked={selected} onChange={() => onSelect(o.id)} />
                    <span
                      aria-hidden
                      className={cn('grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors duration-150', selected ? 'border-brand-500' : 'border-line-strong')}
                    >
                      <span className={cn('size-2 rounded-full bg-brand-500 transition-opacity duration-150', selected ? 'opacity-100' : 'opacity-0')} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold text-fg">{o.name}</span>
                        <span className="text-xs text-muted">{o.carrier}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-fg-2">{formatBusinessDays(o.minDays, o.maxDays)}</span>
                      <span className="block text-xs text-muted">Entrega estimada {formatDeliveryWindow(o.estimate.from, o.estimate.to)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      {o.isFree ? (
                        <>
                          <span className="block text-sm font-bold text-success">Grátis</span>
                          <span className="text-xs tabular-nums text-muted line-through">{formatPrice(o.originalPrice)}</span>
                        </>
                      ) : (
                        <span className="text-sm font-bold tabular-nums text-fg">{formatPrice(o.price)}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {quote.isMock && (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
              <Info className="mt-px size-3.5 shrink-0" strokeWidth={1.75} aria-hidden /> Valores e prazos simulados: nenhuma transportadora está conectada ainda. A estimativa considera apenas dias úteis.
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

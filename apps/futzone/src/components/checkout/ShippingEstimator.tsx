'use client';

import { useId, useState } from 'react';
import { Truck } from 'lucide-react';
import type { ShippingItem, ShippingQuote } from '@/services/shipping/shipping.types';
import { shippingService } from '@/services/shipping/shipping.service';
import { ShippingError } from '@/services/shipping/shipping.types';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { formatCEP, isValidCEP } from '@/lib/validation';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';

/**
 * "Calcular frete": prévia rápida pelo CEP (carrinho e página do produto).
 * O resultado fica numa região aria-live sempre montada, para o leitor de tela
 * anunciar cada nova cotação.
 */
export function ShippingEstimator({ items, subtotal }: { items: ShippingItem[]; subtotal: number }) {
  const [cep, setCep] = useState('');
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorId = useId();

  const calc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCEP(cep)) {
      setError('Digite um CEP com 8 dígitos.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setQuote(await shippingService.calculateShipping({ destinationZip: cep, items, subtotal }));
    } catch (err) {
      setError(err instanceof ShippingError ? err.message : 'Não foi possível calcular agora.');
    }
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={calc} className="flex gap-2" noValidate>
        <label htmlFor="cart-cep" className="sr-only">
          CEP para calcular o frete
        </label>
        <Input
          id="cart-cep"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="Seu CEP"
          value={cep}
          onChange={(e) => setCep(formatCEP(e.target.value))}
          className="h-10"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        />
        <Button type="submit" variant="secondary" size="sm" className="h-10 shrink-0" loading={loading} disabled={!items.length}>
          {!loading && <Truck className="size-4" strokeWidth={1.75} aria-hidden />} Calcular
        </Button>
      </form>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      <div aria-live="polite">
        {quote && !error && (
          <div className="animate-fade mt-3">
            <ul className="divide-y divide-line border-y border-line text-xs">
              {quote.options.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[0.8rem] font-semibold text-fg">{o.name}</span>
                    <span className="mt-0.5 block text-muted">
                      {formatBusinessDays(o.minDays, o.maxDays)}, {formatDeliveryWindow(o.estimate.from, o.estimate.to)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.8rem] font-bold tabular-nums text-fg">{o.isFree ? 'Grátis' : formatPrice(o.price)}</span>
                </li>
              ))}
            </ul>
            {quote.isMock && <p className="mt-2 text-xs leading-relaxed text-muted">Valores e prazos simulados. Nenhuma transportadora está conectada ainda.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

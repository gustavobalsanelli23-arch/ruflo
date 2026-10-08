'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';
import type { ShippingItem, ShippingQuote } from '@/services/shipping/shipping.types';
import { shippingService } from '@/services/shipping/shipping.service';
import { ShippingError } from '@/services/shipping/shipping.types';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { formatCEP, isValidCEP } from '@/lib/validation';
import { formatPrice } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';

/** "Calcular frete" do carrinho — prévia rápida pelo CEP. */
export function ShippingEstimator({ items, subtotal }: { items: ShippingItem[]; subtotal: number }) {
  const [cep, setCep] = useState('');
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        <label htmlFor="cart-cep" className="sr-only">CEP para calcular o frete</label>
        <Input id="cart-cep" inputMode="numeric" autoComplete="postal-code" placeholder="Seu CEP" value={cep} onChange={(e) => setCep(formatCEP(e.target.value))} className="h-10" aria-invalid={!!error} />
        <Button type="submit" variant="secondary" size="sm" className="h-10 shrink-0" loading={loading} disabled={!items.length}>
          {!loading && <Truck className="size-4" />} Calcular
        </Button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      {quote && !error && (
        <ul className="animate-fade-up mt-3 space-y-2 text-xs" aria-live="polite">
          {quote.options.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
              <span>
                <span className="block font-semibold text-fg">{o.name}</span>
                <span className="text-muted">{formatBusinessDays(o.minDays, o.maxDays)} · {formatDeliveryWindow(o.estimate.from, o.estimate.to)}</span>
              </span>
              <span className="font-bold tabular-nums text-fg">{o.isFree ? 'Grátis' : formatPrice(o.price)}</span>
            </li>
          ))}
          {quote.isMock && <li className="text-[0.7rem] text-subtle">Valores e prazos simulados — transportadora ainda não integrada.</li>}
        </ul>
      )}
    </div>
  );
}

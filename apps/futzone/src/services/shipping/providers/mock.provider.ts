import type { MockRate } from '../shipping.settings';
import { billableKg } from '../package';
import type { ProviderRate, ShippingProvider, ShippingRequest, ShippingServiceInfo, TrackingInfo } from '../shipping.types';

/**
 * Provedor SIMULADO para desenvolvimento. Os valores vêm da tabela
 * configurável `mockRates` (base + adicional por kg) e NÃO representam uma
 * cotação real de nenhuma transportadora.
 */
export class MockShippingProvider implements ShippingProvider {
  readonly id = 'mock' as const;
  readonly name = 'Frete simulado';
  readonly isMock = true;

  constructor(private readonly rates: MockRate[]) {}

  async calculate(request: ShippingRequest): Promise<ProviderRate[]> {
    const kg = billableKg(request.package);
    return this.rates
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        name: r.name,
        carrier: r.carrier,
        price: r.basePrice + r.pricePerExtraKg * Math.max(0, kg - 1),
        minDays: r.minDays,
        maxDays: r.maxDays,
      }));
  }

  async getOptions(): Promise<ShippingServiceInfo[]> {
    return this.rates.filter((r) => r.enabled).map(({ id, name, carrier }) => ({ id, name, carrier }));
  }

  /** Sem transportadora conectada não há rastreamento real. */
  async track(): Promise<TrackingInfo | null> {
    return null;
  }
}

import type { ShippingSettings } from '../shipping.settings';
import type { ShippingProvider, ShippingProviderId } from '../shipping.types';
import { MockShippingProvider } from './mock.provider';

/**
 * Registro de provedores de frete.
 *
 * Para conectar uma transportadora real:
 *   1. crie `providers/correios.provider.ts` (ou melhor-envio / frenet)
 *      implementando `ShippingProvider`;
 *   2. faça as chamadas pelo servidor (rota de API) com as credenciais em
 *      variáveis de ambiente — nunca no navegador;
 *   3. retorne a instância aqui. O checkout não precisa mudar.
 */
export interface ProviderInfo {
  id: ShippingProviderId;
  name: string;
  configured: boolean;
  description: string;
}

export const SHIPPING_PROVIDERS: ProviderInfo[] = [
  { id: 'mock', name: 'Simulação local', configured: true, description: 'Tabela configurável para desenvolvimento — não é cotação real.' },
  { id: 'correios', name: 'Correios', configured: false, description: 'PAC, SEDEX e rastreamento (contrato + API).' },
  { id: 'melhor-envio', name: 'Melhor Envio', configured: false, description: 'Cotação multitransportadora e etiquetas.' },
  { id: 'frenet', name: 'Frenet', configured: false, description: 'Gateway de frete com várias transportadoras.' },
];

export function createShippingProvider(settings: ShippingSettings): ShippingProvider {
  switch (settings.providerId) {
    case 'mock':
    default:
      // Correios / Melhor Envio / Frenet ainda não estão integrados.
      return new MockShippingProvider(settings.mockRates);
  }
}

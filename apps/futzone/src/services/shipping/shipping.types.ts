import type { Cents, CategoryId } from '@/types/catalog';

/**
 * Tipos da camada de frete. O checkout conversa apenas com estes tipos e com
 * `ShippingService` — trocar Mock → Correios/Melhor Envio/Frenet não muda a UI.
 */

export type ShippingProviderId = 'mock' | 'correios' | 'melhor-envio' | 'frenet';

/** Item a ser enviado (derivado do carrinho). */
export interface ShippingItem {
  productId: string;
  category: CategoryId;
  quantity: number;
  unitPrice: Cents;
}

export interface PackageDimensions {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

/** Pacote consolidado enviado ao provedor (peso, dimensões, quantidade, valor). */
export interface ShippingPackage extends PackageDimensions {
  items: number;
  declaredValue: Cents;
}

/** Resumo do pacote guardado no pedido. */
export type PackageSummary = ShippingPackage;

export interface ShippingRequest {
  /** CEP de origem do estoque ('' enquanto não configurado). */
  originZip: string;
  /** CEP de destino (8 dígitos). */
  destinationZip: string;
  package: ShippingPackage;
}

/** Serviço oferecido por um provedor (sem preço). */
export interface ShippingServiceInfo {
  id: string;
  name: string;
  carrier: string;
}

/** Cotação "crua" devolvida pelo provedor, antes das regras da loja. */
export interface ProviderRate extends ShippingServiceInfo {
  price: Cents;
  /** Prazo informado pelo serviço, em dias úteis. */
  minDays: number;
  maxDays: number;
}

/** Opção pronta para exibir no checkout (com regras e estimativa de data). */
export interface ShippingOption extends ProviderRate {
  /** Valor antes de regras de frete grátis. */
  originalPrice: Cents;
  isFree: boolean;
  /** Janela estimada de entrega (AAAA-MM-DD). */
  estimate: { from: string; to: string };
  provider: ShippingProviderId;
  isMock: boolean;
}

export interface FreeShippingStatus {
  enabled: boolean;
  minSubtotal: Cents;
  /** Quanto falta para atingir o frete grátis (0 = atingido). */
  remaining: Cents;
  applied: boolean;
}

export interface ShippingQuote {
  request: ShippingRequest;
  options: ShippingOption[];
  provider: ShippingProviderId;
  isMock: boolean;
  quotedAt: string;
  freeShipping: FreeShippingStatus;
}

export type TrackingStatus = 'postado' | 'em_transito' | 'saiu_para_entrega' | 'entregue' | 'indisponivel';

export interface TrackingEvent {
  at: string;
  description: string;
  location?: string;
}

export interface TrackingInfo {
  code: string;
  carrier: string;
  status: TrackingStatus;
  lastUpdate?: string;
  /** Previsão (AAAA-MM-DD) — só quando o provedor/cotação informar. */
  estimatedDelivery?: string;
  events: TrackingEvent[];
  /** `provider` = dados da transportadora; `interno` = atualizações registradas pela loja. */
  source: 'provider' | 'interno';
  isMock: boolean;
}

/**
 * Contrato de qualquer provedor de frete.
 * Implementações reais (Correios, Melhor Envio, Frenet) devem rodar no
 * SERVIDOR (rotas de API), com credenciais em variáveis de ambiente.
 */
export interface ShippingProvider {
  readonly id: ShippingProviderId;
  readonly name: string;
  readonly isMock: boolean;
  /** Cota o envio de um pacote. */
  calculate(request: ShippingRequest): Promise<ProviderRate[]>;
  /** Serviços que o provedor oferece. */
  getOptions(): Promise<ShippingServiceInfo[]>;
  /** Rastreamento por código. `null` = provedor sem rastreio ou integração inexistente. */
  track(code: string): Promise<TrackingInfo | null>;
}

export class ShippingError extends Error {
  constructor(
    message: string,
    readonly code: 'cep_invalido' | 'sem_itens' | 'provedor_indisponivel',
  ) {
    super(message);
  }
}

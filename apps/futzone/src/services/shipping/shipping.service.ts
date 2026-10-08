import type { Order } from '@/types/commerce';
import type { Cents } from '@/types/catalog';
import { onlyDigits } from '@/lib/validation';
import { estimateWindow } from './delivery';
import { buildPackage } from './package';
import { createShippingProvider } from './providers';
import { shippingSettingsRepository, type ShippingSettings } from './shipping.settings';
import {
  ShippingError,
  type FreeShippingStatus,
  type ShippingItem,
  type ShippingOption,
  type ShippingProvider,
  type ShippingQuote,
  type TrackingInfo,
  type TrackingStatus,
} from './shipping.types';

export interface QuoteInput {
  destinationZip: string;
  items: ShippingItem[];
  /** Subtotal dos produtos — usado nas regras de frete grátis. */
  subtotal: Cents;
}

/** Aplica a regra de frete grátis da loja (quando ativada). */
export function freeShippingStatus(settings: ShippingSettings, subtotal: Cents): FreeShippingStatus {
  const rule = settings.freeShipping;
  const applied = rule.enabled && subtotal >= rule.minSubtotal;
  return { enabled: rule.enabled, minSubtotal: rule.minSubtotal, remaining: rule.enabled ? Math.max(0, rule.minSubtotal - subtotal) : 0, applied };
}

/**
 * Fachada única de frete usada por carrinho, checkout e painel.
 * Monta o pacote, consulta o provedor configurado, aplica regras da loja e
 * calcula a janela estimada de entrega.
 */
export class ShippingService {
  private cache = new Map<string, { at: number; quote: ShippingQuote }>();

  constructor(private readonly loadSettings: () => ShippingSettings = () => shippingSettingsRepository.get()) {}

  private provider(settings: ShippingSettings): ShippingProvider {
    return createShippingProvider(settings);
  }

  async calculateShipping(input: QuoteInput, now: Date = new Date()): Promise<ShippingQuote> {
    const destinationZip = onlyDigits(input.destinationZip);
    if (destinationZip.length !== 8) throw new ShippingError('Informe um CEP válido com 8 dígitos.', 'cep_invalido');
    if (!input.items.length) throw new ShippingError('Não há produtos para calcular o frete.', 'sem_itens');

    const settings = this.loadSettings();
    const pkg = buildPackage(input.items, settings);
    const request = { originZip: onlyDigits(settings.originZip), destinationZip, package: pkg };

    const key = JSON.stringify([request, input.subtotal, settings]);
    const hit = this.cache.get(key);
    if (hit && now.getTime() - hit.at < 5 * 60_000) return hit.quote;

    const provider = this.provider(settings);
    let rates;
    try {
      rates = await provider.calculate(request);
    } catch {
      throw new ShippingError('Não foi possível calcular o frete agora. Tente novamente.', 'provedor_indisponivel');
    }

    const free = freeShippingStatus(settings, input.subtotal);
    const options: ShippingOption[] = rates
      .map((rate) => {
        const isFree = free.applied && settings.freeShipping.serviceIds.includes(rate.id);
        return {
          ...rate,
          originalPrice: rate.price,
          price: isFree ? 0 : rate.price,
          isFree,
          estimate: estimateWindow(rate.minDays, rate.maxDays, settings.handlingDays, now),
          provider: provider.id,
          isMock: provider.isMock,
        };
      })
      .sort((a, b) => a.price - b.price || a.maxDays - b.maxDays);

    const quote: ShippingQuote = { request, options, provider: provider.id, isMock: provider.isMock, quotedAt: now.toISOString(), freeShipping: free };
    this.cache.set(key, { at: now.getTime(), quote });
    return quote;
  }

  async getShippingOptions(input: QuoteInput): Promise<ShippingOption[]> {
    return (await this.calculateShipping(input)).options;
  }

  /**
   * Rastreamento do pedido. Sem transportadora integrada, devolve apenas as
   * atualizações registradas pela própria loja (claramente marcadas).
   */
  async trackShipment(order: Order): Promise<TrackingInfo | null> {
    if (!order.tracking) return null;
    const fromProvider = await this.provider(this.loadSettings()).track(order.tracking.code);
    if (fromProvider) return fromProvider;

    const history = order.history ?? [];
    const relevant = history.filter((e) => ['enviado', 'em_transito', 'rastreio', 'entregue'].includes(e.type));
    const labels: Record<string, string> = {
      enviado: 'Pedido enviado pela loja',
      rastreio: 'Código de rastreio registrado',
      em_transito: 'Em trânsito',
      entregue: 'Entregue ao destinatário',
    };
    const status: TrackingStatus = order.status === 'entregue' ? 'entregue' : order.status === 'enviado' ? 'em_transito' : 'postado';
    const events = relevant
      .map((e) => ({ at: e.at, description: e.note ?? labels[e.type] ?? e.type }))
      .sort((a, b) => b.at.localeCompare(a.at));
    return {
      code: order.tracking.code,
      carrier: order.tracking.carrier,
      status,
      lastUpdate: events[0]?.at ?? order.tracking.addedAt,
      estimatedDelivery: order.status === 'entregue' ? undefined : order.shipping?.estimatedTo,
      events,
      source: 'interno',
      isMock: true,
    };
  }
}

export const shippingService = new ShippingService();

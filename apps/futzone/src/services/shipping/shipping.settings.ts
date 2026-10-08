import type { Cents } from '@/types/catalog';
import { readJSON, STORAGE_KEYS, writeJSON } from '@/services/storage';
import type { PackageDimensions, ShippingProviderId } from './shipping.types';

/** Tabela usada SOMENTE pelo provedor simulado (nenhum valor é cotação real). */
export interface MockRate {
  id: string;
  name: string;
  carrier: string;
  enabled: boolean;
  basePrice: Cents;
  /** Acréscimo por kg (cobrável) acima do primeiro. */
  pricePerExtraKg: Cents;
  minDays: number;
  maxDays: number;
}

export interface FreeShippingRule {
  /** Desligada por padrão: a regra só vale depois de definida pela loja. */
  enabled: boolean;
  minSubtotal: Cents;
  /** Serviços que ficam grátis (ex.: só PAC). */
  serviceIds: string[];
}

export interface ShippingSettings {
  providerId: ShippingProviderId;
  /** CEP de origem do estoque. Vazio = ainda não definido. */
  originZip: string;
  /** Dias úteis para separar e postar o pedido (somados ao prazo da transportadora). */
  handlingDays: number;
  freeShipping: FreeShippingRule;
  /** Peso da embalagem, somado ao peso dos produtos. */
  boxWeightGrams: number;
  /** Peso/dimensões padrão por tipo de produto (o catálogo ainda não tem esses dados). */
  profiles: { camisa: PackageDimensions; kit: PackageDimensions };
  mockRates: MockRate[];
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  providerId: 'mock',
  originZip: '',
  handlingDays: 0,
  freeShipping: { enabled: false, minSubtotal: 29900, serviceIds: ['pac'] },
  boxWeightGrams: 100,
  profiles: {
    camisa: { weightGrams: 250, lengthCm: 30, widthCm: 25, heightCm: 3 },
    kit: { weightGrams: 450, lengthCm: 32, widthCm: 26, heightCm: 6 },
  },
  mockRates: [
    { id: 'pac', name: 'PAC', carrier: 'Correios', enabled: true, basePrice: 2490, pricePerExtraKg: 300, minDays: 6, maxDays: 9 },
    { id: 'sedex', name: 'SEDEX', carrier: 'Correios', enabled: true, basePrice: 3990, pricePerExtraKg: 500, minDays: 2, maxDays: 4 },
    { id: 'expressa', name: 'Entrega expressa', carrier: 'Transportadora', enabled: true, basePrice: 4990, pricePerExtraKg: 700, minDays: 1, maxDays: 2 },
  ],
};

/** Repositório das configurações de frete (local agora; banco de dados depois). */
export interface ShippingSettingsRepository {
  get(): ShippingSettings;
  save(settings: ShippingSettings): void;
  reset(): ShippingSettings;
}

export const shippingSettingsRepository: ShippingSettingsRepository = {
  get() {
    const stored = readJSON<Partial<ShippingSettings>>(STORAGE_KEYS.shippingSettings, {});
    return {
      ...DEFAULT_SHIPPING_SETTINGS,
      ...stored,
      freeShipping: { ...DEFAULT_SHIPPING_SETTINGS.freeShipping, ...stored.freeShipping },
      profiles: { ...DEFAULT_SHIPPING_SETTINGS.profiles, ...stored.profiles },
      mockRates: stored.mockRates?.length ? stored.mockRates : DEFAULT_SHIPPING_SETTINGS.mockRates,
    };
  },
  save(settings) {
    writeJSON(STORAGE_KEYS.shippingSettings, settings);
  },
  reset() {
    writeJSON(STORAGE_KEYS.shippingSettings, DEFAULT_SHIPPING_SETTINGS);
    return DEFAULT_SHIPPING_SETTINGS;
  },
};

import { describe, expect, it } from 'vitest';
import { DEFAULT_SHIPPING_SETTINGS, type ShippingSettings } from '@/services/shipping/shipping.settings';
import { billableKg, buildPackage } from '@/services/shipping/package';
import { addBusinessDays, estimateWindow, formatBusinessDays, formatDeliveryWindow, toDateKey } from '@/services/shipping/delivery';
import { MockShippingProvider } from '@/services/shipping/providers/mock.provider';
import { freeShippingStatus, ShippingService } from '@/services/shipping/shipping.service';
import { ShippingError, type ShippingItem } from '@/services/shipping/shipping.types';

const shirt = (quantity = 1): ShippingItem => ({ productId: 'p-1', category: 'clubes', quantity, unitPrice: 29990 });
const kit = (quantity = 1): ShippingItem => ({ productId: 'p-2', category: 'kits', quantity, unitPrice: 39990 });
const settings = (patch: Partial<ShippingSettings> = {}): ShippingSettings => ({ ...DEFAULT_SHIPPING_SETTINGS, ...patch });
// Quarta-feira, 7 de outubro de 2026.
const WEDNESDAY = new Date(2026, 9, 7, 10);

describe('pacote', () => {
  it('soma pesos, empilha alturas e usa a maior base', () => {
    const pkg = buildPackage([shirt(2), kit()], DEFAULT_SHIPPING_SETTINGS);
    expect(pkg.weightGrams).toBe(100 + 250 * 2 + 450);
    expect(pkg.heightCm).toBe(3 * 2 + 6);
    expect(pkg.lengthCm).toBe(32);
    expect(pkg.items).toBe(3);
    expect(pkg.declaredValue).toBe(29990 * 2 + 39990);
  });

  it('cobra no mínimo 1 kg e usa o peso cúbico quando maior', () => {
    expect(billableKg({ weightGrams: 300, lengthCm: 10, widthCm: 10, heightCm: 2 })).toBe(1);
    expect(billableKg({ weightGrams: 1200, lengthCm: 10, widthCm: 10, heightCm: 2 })).toBe(2);
    expect(billableKg({ weightGrams: 500, lengthCm: 40, widthCm: 30, heightCm: 20 })).toBe(4);
  });
});

describe('prazo de entrega', () => {
  it('conta apenas dias úteis', () => {
    expect(toDateKey(addBusinessDays(WEDNESDAY, 2))).toBe('2026-10-09'); // sexta
    expect(toDateKey(addBusinessDays(WEDNESDAY, 3))).toBe('2026-10-12'); // pula o fim de semana
  });

  it('gera janela estimada somando o prazo de postagem', () => {
    expect(estimateWindow(2, 4, 0, WEDNESDAY)).toEqual({ from: '2026-10-09', to: '2026-10-13' });
    expect(estimateWindow(2, 4, 1, WEDNESDAY)).toEqual({ from: '2026-10-12', to: '2026-10-14' });
  });

  it('formata a janela sem prometer data exata', () => {
    expect(formatDeliveryWindow('2026-10-14', '2026-10-18')).toBe('entre 14 e 18 de outubro');
    expect(formatDeliveryWindow('2026-10-30', '2026-11-03')).toBe('entre 30 de outubro e 3 de novembro');
    expect(formatBusinessDays(6, 9)).toBe('6 a 9 dias úteis');
    expect(formatBusinessDays(1, 1)).toBe('1 dia útil');
  });
});

describe('provedor simulado', () => {
  it('calcula base + adicional por kg e ignora serviços desativados', async () => {
    const rates = DEFAULT_SHIPPING_SETTINGS.mockRates.map((r) => (r.id === 'expressa' ? { ...r, enabled: false } : r));
    const provider = new MockShippingProvider(rates);
    const result = await provider.calculate({ originZip: '', destinationZip: '01310100', package: { weightGrams: 2500, lengthCm: 30, widthCm: 25, heightCm: 3, items: 1, declaredValue: 0 } });
    expect(result.map((r) => r.id)).toEqual(['pac', 'sedex']);
    expect(result[0].price).toBe(2490 + 300 * 2);
    expect(await provider.track()).toBeNull();
  });
});

describe('ShippingService', () => {
  it('valida o CEP e os itens', async () => {
    const service = new ShippingService(() => settings());
    await expect(service.calculateShipping({ destinationZip: '123', items: [shirt()], subtotal: 100 })).rejects.toBeInstanceOf(ShippingError);
    await expect(service.calculateShipping({ destinationZip: '01310100', items: [], subtotal: 0 })).rejects.toThrow('Não há produtos');
  });

  it('marca as opções como simuladas, ordena pelo preço e calcula a estimativa', async () => {
    const quote = await new ShippingService(() => settings()).calculateShipping({ destinationZip: '01310-100', items: [shirt()], subtotal: 29990 }, WEDNESDAY);
    expect(quote.isMock).toBe(true);
    expect(quote.options.map((o) => o.id)).toEqual(['pac', 'sedex', 'expressa']);
    expect(quote.options.every((o) => o.isMock && !o.isFree)).toBe(true);
    expect(quote.options[1].estimate).toEqual({ from: '2026-10-09', to: '2026-10-13' });
  });

  it('não aplica frete grátis enquanto a regra estiver desligada', async () => {
    const quote = await new ShippingService(() => settings()).calculateShipping({ destinationZip: '01310100', items: [shirt(3)], subtotal: 89970 });
    expect(quote.freeShipping.enabled).toBe(false);
    expect(quote.options.some((o) => o.price === 0)).toBe(false);
  });

  it('aplica frete grátis só nos serviços configurados quando ativado', async () => {
    const s = settings({ freeShipping: { enabled: true, minSubtotal: 29900, serviceIds: ['pac'] } });
    const quote = await new ShippingService(() => s).calculateShipping({ destinationZip: '01310100', items: [shirt()], subtotal: 29990 });
    const pac = quote.options.find((o) => o.id === 'pac')!;
    expect(pac.isFree).toBe(true);
    expect(pac.price).toBe(0);
    expect(pac.originalPrice).toBe(2490);
    expect(quote.options.find((o) => o.id === 'sedex')!.price).toBe(3990);
    expect(freeShippingStatus(s, 19900)).toMatchObject({ applied: false, remaining: 10000 });
  });
});

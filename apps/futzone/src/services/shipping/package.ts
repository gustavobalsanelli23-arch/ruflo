import type { ShippingSettings } from './shipping.settings';
import type { PackageDimensions, ShippingItem, ShippingPackage } from './shipping.types';

/** Perfil de embalagem por produto (kits são mais pesados que camisas avulsas). */
export function profileFor(item: ShippingItem, settings: ShippingSettings): PackageDimensions {
  return item.category === 'kits' ? settings.profiles.kit : settings.profiles.camisa;
}

/**
 * Consolida os itens em um único pacote: soma pesos, empilha alturas e usa a
 * maior base. Peso cobrável = maior entre real e cúbico (C×L×A / 6000).
 */
export function buildPackage(items: ShippingItem[], settings: ShippingSettings): ShippingPackage {
  let weightGrams = settings.boxWeightGrams;
  let lengthCm = 0;
  let widthCm = 0;
  let heightCm = 0;
  let count = 0;
  let declaredValue = 0;
  for (const item of items) {
    const p = profileFor(item, settings);
    weightGrams += p.weightGrams * item.quantity;
    lengthCm = Math.max(lengthCm, p.lengthCm);
    widthCm = Math.max(widthCm, p.widthCm);
    heightCm += p.heightCm * item.quantity;
    count += item.quantity;
    declaredValue += item.unitPrice * item.quantity;
  }
  return { weightGrams, lengthCm, widthCm, heightCm: Math.max(2, heightCm), items: count, declaredValue };
}

/** Peso cobrável em kg (real × cúbico), arredondado para cima. */
export function billableKg(pkg: PackageDimensions): number {
  const real = pkg.weightGrams / 1000;
  const cubic = (pkg.lengthCm * pkg.widthCm * pkg.heightCm) / 6000;
  return Math.max(1, Math.ceil(Math.max(real, cubic)));
}

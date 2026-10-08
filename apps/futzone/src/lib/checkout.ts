import type { CartLine } from './cart';
import type { ShippingItem } from '@/services/shipping/shipping.types';

/** Itens do carrinho no formato do serviço de frete (só os disponíveis). */
export function toShippingItems(lines: CartLine[]): ShippingItem[] {
  return lines
    .filter((l) => l.status === 'ok' && l.product)
    .map((l) => ({ productId: l.productId, category: l.product!.category, quantity: l.quantity, unitPrice: l.unitPrice }));
}

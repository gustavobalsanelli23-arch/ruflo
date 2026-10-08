import type { Product, Size } from '@/types/catalog';
import type { CartItem } from '@/types/commerce';
import { stockFor } from '@/lib/product';

/**
 * Validação de estoque antes de avançar e antes de confirmar o pedido.
 *
 * Hoje usa o estoque local do catálogo. Com o fornecedor integrado,
 * implemente `InventoryProvider.check` consultando a API (no servidor) e
 * valide de novo no momento da confirmação — o estoque pode mudar no meio.
 */

export type StockIssueKind = 'indisponivel' | 'insuficiente';

export interface StockIssue {
  productId: string;
  size: Size;
  name: string;
  requested: number;
  available: number;
  kind: StockIssueKind;
}

export const STOCK_ISSUE_MESSAGE: Record<StockIssueKind, string> = {
  indisponivel: 'Este produto ficou indisponível.',
  insuficiente: 'Estoque menor que a quantidade escolhida.',
};

/** Compara o carrinho com o estoque atual (função pura). */
export function findStockIssues(items: CartItem[], products: Product[]): StockIssue[] {
  const issues: StockIssue[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    const name = product?.name ?? item.snapshot?.name ?? 'Produto';
    const sellable = !!product && product.status === 'published' && product.sizes.includes(item.size);
    const available = sellable ? stockFor(product, item.size) : 0;
    if (available <= 0) issues.push({ productId: item.productId, size: item.size, name, requested: item.quantity, available: 0, kind: 'indisponivel' });
    else if (available < item.quantity) issues.push({ productId: item.productId, size: item.size, name, requested: item.quantity, available, kind: 'insuficiente' });
  }
  return issues;
}

export interface InventoryProvider {
  check(items: CartItem[]): Promise<StockIssue[]>;
}

export function createLocalInventory(getProducts: () => Product[]): InventoryProvider {
  return { check: async (items) => findStockIssues(items, getProducts()) };
}

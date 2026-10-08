import type { Product } from '@/types/catalog';
import type { Order } from '@/types/commerce';

/**
 * Contratos das integrações FUTURAS que ainda não têm implementação.
 * (Frete, CEP, cupons, estoque, autenticação e notificações já têm interface
 * própria em services/* com uma implementação local de demonstração.)
 */

/** API do fornecedor: sincroniza catálogo e estoque com `ProductRepository` / `InventoryProvider`. */
export interface SupplierCatalogClient {
  fetchProducts(updatedSince?: string): Promise<Product[]>;
  fetchStock(productIds: string[]): Promise<Record<string, Product['stock']>>;
}

/**
 * Gateway de pagamento — nenhum provedor escolhido ainda.
 * Credenciais ficarão apenas no servidor; o status volta por webhook
 * assinado e atualiza `order.payment`.
 */
export interface PaymentGateway {
  readonly id: string;
  createPayment(order: Order, method: 'pix' | 'cartao' | 'boleto'): Promise<{ paymentId: string; redirectUrl?: string; pixCode?: string }>;
  getPaymentStatus(paymentId: string): Promise<'pending' | 'approved' | 'rejected' | 'refunded'>;
}

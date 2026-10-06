import type { Cents, Product } from '@/types/catalog';
import type { Address, CartItem, Order } from '@/types/commerce';

/**
 * Contratos das integrações FUTURAS. Somente tipos — nada aqui está
 * implementado nesta etapa (sem checkout, pagamento, fornecedor ou banco real).
 * Eles documentam onde cada integração se encaixará sem mudar os componentes.
 */

/** API do fornecedor: sincroniza catálogo e estoque com `ProductRepository`. */
export interface SupplierCatalogClient {
  fetchProducts(updatedSince?: string): Promise<Product[]>;
  fetchStock(productIds: string[]): Promise<Record<string, Product['stock']>>;
}

/** Checkout: transforma o carrinho em pedido. Será criado em etapa própria. */
export interface CheckoutService {
  quoteShipping(items: CartItem[], zip: string): Promise<Array<{ id: string; label: string; price: Cents; days: number }>>;
  createOrder(input: { items: CartItem[]; address: Address; shippingId: string }): Promise<Order>;
}

/** Gateway de pagamento (ex.: Mercado Pago). Credenciais ficarão apenas no servidor. */
export interface PaymentGateway {
  createPayment(order: Order): Promise<{ paymentId: string; redirectUrl?: string }>;
  getPaymentStatus(paymentId: string): Promise<'pending' | 'approved' | 'rejected' | 'refunded'>;
}

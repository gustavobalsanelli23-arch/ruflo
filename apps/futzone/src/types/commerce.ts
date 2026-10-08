import type { Cents, Size } from './catalog';
import type { PackageSummary } from '@/services/shipping/shipping.types';

export interface CartItem {
  productId: string;
  size: Size;
  quantity: number;
  /**
   * Cópia do nome/foto/preço no momento em que o item entrou no carrinho.
   * Permite avisar "Este produto ficou indisponível" mesmo se ele sair do catálogo.
   */
  snapshot?: { name: string; image?: string; price: Cents };
}

export type OrderStatus = 'pendente' | 'preparacao' | 'enviado' | 'entregue' | 'cancelado';

export const ORDER_STATUSES: OrderStatus[] = ['pendente', 'preparacao', 'enviado', 'entregue', 'cancelado'];

export interface OrderLine {
  productId: string;
  name: string;
  size: Size;
  quantity: number;
  unitPrice: Cents;
  image?: string;
}

/**
 * Status do pagamento. `aguardando_integracao` = o pedido foi registrado,
 * mas ainda não existe gateway de pagamento conectado (nenhuma cobrança).
 */
export type PaymentStatus = 'aguardando_integracao' | 'pendente' | 'aprovado' | 'recusado' | 'estornado';

export interface OrderPayment {
  status: PaymentStatus;
  /** Preenchidos pelo gateway quando houver integração (ex.: Pix, cartão). */
  method?: string;
  gateway?: string;
  updatedAt?: string;
}

/** Eventos do histórico do pedido — base da timeline e das notificações do cliente. */
export type OrderEventType = 'criado' | 'pagamento_aprovado' | 'preparacao' | 'enviado' | 'em_transito' | 'entregue' | 'cancelado' | 'rastreio';

export interface OrderEvent {
  type: OrderEventType;
  at: string;
  by?: 'cliente' | 'admin' | 'sistema';
  note?: string;
}

/** Entrega escolhida no checkout (cópia da cotação no momento da compra). */
export interface OrderShipping {
  provider: string;
  isMock: boolean;
  serviceId: string;
  serviceName: string;
  carrier: string;
  /** Valor cobrado do cliente (0 quando grátis). */
  price: Cents;
  /** Valor antes de regras de frete grátis / cupom de frete. */
  originalPrice: Cents;
  minDays: number;
  maxDays: number;
  /** Janela estimada de entrega (datas AAAA-MM-DD). */
  estimatedFrom: string;
  estimatedTo: string;
  originZip?: string;
  destinationZip: string;
  package?: PackageSummary;
}

export interface OrderTracking {
  code: string;
  carrier: string;
  url?: string;
  addedAt: string;
}

export interface OrderCoupon {
  code: string;
  description: string;
  amount: Cents;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  /** Compra feita sem conta (checkout de visitante). */
  guest?: boolean;
  lines: OrderLine[];
  /** Soma dos produtos (preço de venda). */
  subtotal?: Cents;
  discount?: Cents;
  shippingCost?: Cents;
  coupon?: OrderCoupon;
  total: Cents;
  status: OrderStatus;
  createdAt: string;
  /** Endereço de entrega copiado no momento da compra. */
  address?: Address;
  shipping?: OrderShipping;
  payment?: OrderPayment;
  tracking?: OrderTracking;
  history?: OrderEvent[];
}

export interface Address {
  id: string;
  /** Identificação: Casa, Trabalho… */
  label: string;
  recipient: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zip: string;
  /** Ponto de referência para o entregador. */
  reference?: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate?: string;
  city: string;
  state: string;
  createdAt: string;
  addresses: Address[];
  /** `cadastro` = criado pelo próprio cliente; `exemplo` = dado simulado. */
  origin?: 'cadastro' | 'exemplo';
}

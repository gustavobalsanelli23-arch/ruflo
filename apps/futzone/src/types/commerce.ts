import type { Cents, Size } from './catalog';

export interface CartItem {
  productId: string;
  size: Size;
  quantity: number;
}

export type OrderStatus = 'pendente' | 'preparacao' | 'enviado' | 'entregue' | 'cancelado';

export const ORDER_STATUSES: OrderStatus[] = ['pendente', 'preparacao', 'enviado', 'entregue', 'cancelado'];

export interface OrderLine {
  productId: string;
  name: string;
  size: Size;
  quantity: number;
  unitPrice: Cents;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  lines: OrderLine[];
  total: Cents;
  status: OrderStatus;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  city: string;
  state: string;
  createdAt: string;
  addresses: Address[];
}

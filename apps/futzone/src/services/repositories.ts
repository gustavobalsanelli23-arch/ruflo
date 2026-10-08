import type { Product } from '@/types/catalog';
import type { Customer, Order } from '@/types/commerce';
import { seedProducts } from '@/data/products';
import { seedOrders } from '@/data/orders';
import { seedCustomers } from '@/data/customers';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/lib/product';
import { readJSON, removeKey, STORAGE_KEYS, writeJSON } from './storage';

/**
 * Camada de dados da loja.
 *
 * Os componentes nunca leem `data/*` nem o localStorage diretamente: eles usam
 * estes repositórios (via contextos). Hoje as implementações são locais; no
 * futuro basta criar, por exemplo, `ApiProductRepository` com a mesma
 * interface (API do fornecedor / banco de dados) e trocar a instância exportada
 * no fim deste arquivo.
 */

export interface ProductRepository {
  list(): Promise<Product[]>;
  saveAll(products: Product[]): Promise<void>;
  reset(): Promise<Product[]>;
}

export interface OrderRepository {
  list(): Promise<Order[]>;
  saveAll(orders: Order[]): Promise<void>;
  reset(): Promise<Order[]>;
}

/**
 * Perfis de clientes (dados pessoais e endereços). Credenciais NÃO ficam
 * aqui: são responsabilidade do provedor de autenticação (`services/auth`).
 */
export interface CustomerRepository {
  list(): Promise<Customer[]>;
  saveAll(customers: Customer[]): Promise<void>;
  reset(): Promise<Customer[]>;
}

export interface StoreSettings {
  storeName: string;
  contactEmail: string;
  lowStockThreshold: number;
  showDemoNotice: boolean;
  /** Permite finalizar compra sem criar conta. */
  allowGuestCheckout: boolean;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'FutZone',
  contactEmail: 'contato@futzone.com.br',
  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
  showDemoNotice: true,
  allowGuestCheckout: true,
};

export interface SettingsRepository {
  get(): Promise<StoreSettings>;
  save(settings: StoreSettings): Promise<void>;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

class LocalProductRepository implements ProductRepository {
  async list() {
    return readJSON<Product[]>(STORAGE_KEYS.products, clone(seedProducts));
  }
  async saveAll(products: Product[]) {
    writeJSON(STORAGE_KEYS.products, products);
  }
  async reset() {
    removeKey(STORAGE_KEYS.products);
    return clone(seedProducts);
  }
}

class LocalOrderRepository implements OrderRepository {
  async list() {
    return readJSON<Order[]>(STORAGE_KEYS.orders, clone(seedOrders));
  }
  async saveAll(orders: Order[]) {
    writeJSON(STORAGE_KEYS.orders, orders);
  }
  async reset() {
    removeKey(STORAGE_KEYS.orders);
    return clone(seedOrders);
  }
}

class LocalCustomerRepository implements CustomerRepository {
  async list() {
    return readJSON<Customer[]>(STORAGE_KEYS.customers, clone(seedCustomers));
  }
  async saveAll(customers: Customer[]) {
    writeJSON(STORAGE_KEYS.customers, customers);
  }
  async reset() {
    removeKey(STORAGE_KEYS.customers);
    return clone(seedCustomers);
  }
}

class LocalSettingsRepository implements SettingsRepository {
  async get() {
    return { ...DEFAULT_SETTINGS, ...readJSON<Partial<StoreSettings>>(STORAGE_KEYS.settings, {}) };
  }
  async save(settings: StoreSettings) {
    writeJSON(STORAGE_KEYS.settings, settings);
  }
}

export const productRepository: ProductRepository = new LocalProductRepository();
export const orderRepository: OrderRepository = new LocalOrderRepository();
export const customerRepository: CustomerRepository = new LocalCustomerRepository();
export const settingsRepository: SettingsRepository = new LocalSettingsRepository();

import type { Product } from '@/types/catalog';
import type { Customer, Order } from '@/types/commerce';
import { seedProducts } from '@/data/products';
import { seedOrders } from '@/data/orders';
import { seedCustomers, DEMO_CUSTOMER_ID } from '@/data/customers';
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

export interface CustomerRepository {
  list(): Promise<Customer[]>;
  /** Cliente da sessão atual. Sem autenticação real nesta etapa. */
  current(): Promise<Customer>;
  saveCurrent(customer: Customer): Promise<void>;
  reset(): Promise<Customer>;
}

export interface StoreSettings {
  storeName: string;
  contactEmail: string;
  lowStockThreshold: number;
  showDemoNotice: boolean;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'FutZone',
  contactEmail: 'contato@futzone.com.br',
  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
  showDemoNotice: true,
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
  private seed() {
    return clone(seedCustomers.find((c) => c.id === DEMO_CUSTOMER_ID) ?? seedCustomers[0]);
  }
  async list() {
    const current = await this.current();
    return seedCustomers.map((c) => (c.id === current.id ? current : c));
  }
  async current() {
    return readJSON<Customer>(STORAGE_KEYS.customer, this.seed());
  }
  async saveCurrent(customer: Customer) {
    writeJSON(STORAGE_KEYS.customer, customer);
  }
  async reset() {
    removeKey(STORAGE_KEYS.customer);
    return this.seed();
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

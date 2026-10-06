'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product, ProductInput, ProductStatus, Size } from '@/types/catalog';
import type { Customer, Order, OrderStatus } from '@/types/commerce';
import { seedProducts } from '@/data/products';
import { seedOrders } from '@/data/orders';
import { seedCustomers, DEMO_CUSTOMER_ID } from '@/data/customers';
import {
  customerRepository,
  DEFAULT_SETTINGS,
  orderRepository,
  productRepository,
  settingsRepository,
  type StoreSettings,
} from '@/services/repositories';

interface StoreData {
  /** `false` até os dados locais (localStorage) serem carregados no navegador. */
  hydrated: boolean;
  products: Product[];
  orders: Order[];
  customers: Customer[];
  customer: Customer;
  settings: StoreSettings;
  saveProduct(input: ProductInput): Product;
  deleteProduct(id: string): void;
  setProductStatus(id: string, status: ProductStatus): void;
  setStock(id: string, size: Size, quantity: number): void;
  setOrderStatus(id: string, status: OrderStatus): void;
  saveCustomer(customer: Customer): void;
  saveSettings(settings: StoreSettings): void;
  resetDemoData(): Promise<void>;
}

const StoreDataContext = createContext<StoreData | null>(null);

const demoCustomer = seedCustomers.find((c) => c.id === DEMO_CUSTOMER_ID) ?? seedCustomers[0];

export function StoreDataProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [customer, setCustomer] = useState<Customer>(demoCustomer);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let alive = true;
    Promise.all([productRepository.list(), orderRepository.list(), customerRepository.current(), settingsRepository.get()]).then(
      ([p, o, c, s]) => {
        if (!alive) return;
        setProducts(p);
        setOrders(o);
        setCustomer(c);
        setSettings(s);
        setHydrated(true);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const commitProducts = useCallback((update: (prev: Product[]) => Product[]) => {
    setProducts((prev) => {
      const next = update(prev);
      void productRepository.saveAll(next);
      return next;
    });
  }, []);

  const saveProduct = useCallback(
    (input: ProductInput): Product => {
      const existing = input.id ? products.find((p) => p.id === input.id) : undefined;
      const product: Product = existing
        ? { ...existing, ...input, id: existing.id }
        : {
            ...input,
            id: `p-${Date.now().toString(36)}`,
            createdAt: new Date().toISOString().slice(0, 10),
            salesCount: 0,
          };
      commitProducts((prev) => (existing ? prev.map((p) => (p.id === product.id ? product : p)) : [product, ...prev]));
      return product;
    },
    [products, commitProducts],
  );

  const value = useMemo<StoreData>(
    () => ({
      hydrated,
      products,
      orders,
      customer,
      customers: seedCustomers.map((c) => (c.id === customer.id ? customer : c)),
      settings,
      saveProduct,
      deleteProduct: (id) => commitProducts((prev) => prev.filter((p) => p.id !== id)),
      setProductStatus: (id, status) => commitProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p))),
      setStock: (id, size, quantity) =>
        commitProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, stock: { ...p.stock, [size]: Math.max(0, Math.floor(quantity) || 0) } } : p)),
        ),
      setOrderStatus: (id, status) =>
        setOrders((prev) => {
          const next = prev.map((o) => (o.id === id ? { ...o, status } : o));
          void orderRepository.saveAll(next);
          return next;
        }),
      saveCustomer: (c) => {
        setCustomer(c);
        void customerRepository.saveCurrent(c);
      },
      saveSettings: (s) => {
        setSettings(s);
        void settingsRepository.save(s);
      },
      resetDemoData: async () => {
        const [p, o, c] = await Promise.all([productRepository.reset(), orderRepository.reset(), customerRepository.reset()]);
        setProducts(p);
        setOrders(o);
        setCustomer(c);
      },
    }),
    [hydrated, products, orders, customer, settings, saveProduct, commitProducts],
  );

  return <StoreDataContext.Provider value={value}>{children}</StoreDataContext.Provider>;
}

export function useStoreData(): StoreData {
  const ctx = useContext(StoreDataContext);
  if (!ctx) throw new Error('useStoreData precisa estar dentro de <StoreDataProvider>');
  return ctx;
}

/** Produtos visíveis na loja pública (apenas publicados). */
export function usePublicProducts(): Product[] {
  const { products } = useStoreData();
  return useMemo(() => products.filter((p) => p.status === 'published'), [products]);
}

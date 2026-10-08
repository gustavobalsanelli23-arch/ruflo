'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Cents, Product, ProductInput, ProductStatus, Size } from '@/types/catalog';
import type { Address, CartItem, Customer, Order, OrderEvent, OrderLine, OrderStatus, OrderTracking } from '@/types/commerce';
import type { ShippingOption, ShippingPackage } from '@/services/shipping/shipping.types';
import { seedProducts } from '@/data/products';
import { seedOrders } from '@/data/orders';
import { seedCustomers } from '@/data/customers';
import {
  customerRepository,
  DEFAULT_SETTINGS,
  orderRepository,
  productRepository,
  settingsRepository,
  type StoreSettings,
} from '@/services/repositories';
import { findStockIssues, type StockIssue } from '@/services/inventory.service';
import { couponRepository, evaluateCoupon } from '@/services/coupons/coupon.service';
import { customerAuthProvider } from '@/services/auth/localDemo.provider';
import { buildOrder, computeTotals, EVENT_FOR_STATUS } from '@/lib/orders';
import { toLocalISO } from '@/lib/format';
import { normalizeEmail } from '@/lib/validation';

export interface PlaceOrderInput {
  items: CartItem[];
  /** Conta logada; `null` = compra como visitante (usa `contact`). */
  customer: Customer | null;
  contact: { name: string; email: string; phone: string; cpf: string };
  address: Address;
  shipping: ShippingOption;
  package: ShippingPackage;
  originZip: string;
  couponCode?: string;
}

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: 'estoque'; issues: StockIssue[] }
  | { ok: false; reason: 'vazio' };

interface StoreData {
  /** `false` até os dados locais (localStorage) serem carregados no navegador. */
  hydrated: boolean;
  products: Product[];
  orders: Order[];
  customers: Customer[];
  settings: StoreSettings;
  saveProduct(input: ProductInput): Product;
  deleteProduct(id: string): void;
  setProductStatus(id: string, status: ProductStatus): void;
  setStock(id: string, size: Size, quantity: number): void;
  setOrderStatus(id: string, status: OrderStatus): void;
  setOrderTracking(id: string, tracking: Omit<OrderTracking, 'addedAt'> | null): void;
  upsertCustomer(customer: Customer): void;
  /** Vincula pedidos feitos como visitante à conta criada com o mesmo e-mail. */
  claimGuestOrders(customer: Customer): void;
  /** Revalida o estoque, registra o pedido e dá baixa no estoque. */
  placeOrder(input: PlaceOrderInput): PlaceOrderResult;
  saveSettings(settings: StoreSettings): void;
  resetDemoData(): Promise<void>;
}

const StoreDataContext = createContext<StoreData | null>(null);

export function StoreDataProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let alive = true;
    Promise.all([productRepository.list(), orderRepository.list(), customerRepository.list(), settingsRepository.get()]).then(([p, o, c, s]) => {
      if (!alive) return;
      setProducts(p);
      setOrders(o);
      setCustomers(c);
      setSettings(s);
      setHydrated(true);
    });
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

  const commitOrders = useCallback((update: (prev: Order[]) => Order[]) => {
    setOrders((prev) => {
      const next = update(prev);
      void orderRepository.saveAll(next);
      return next;
    });
  }, []);

  const commitCustomers = useCallback((update: (prev: Customer[]) => Customer[]) => {
    setCustomers((prev) => {
      const next = update(prev);
      void customerRepository.saveAll(next);
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

  const placeOrder = useCallback(
    (input: PlaceOrderInput): PlaceOrderResult => {
      if (!input.items.length) return { ok: false, reason: 'vazio' };
      // Validação final de estoque (com fornecedor integrado, consultar a API aqui).
      const issues = findStockIssues(input.items, products);
      if (issues.length) return { ok: false, reason: 'estoque', issues };

      const lines: OrderLine[] = input.items.map((item) => {
        const p = products.find((x) => x.id === item.productId)!;
        return { productId: p.id, name: p.name, size: item.size, quantity: item.quantity, unitPrice: p.price, image: p.images[0]?.src };
      });
      const priced = lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, compareAtPrice: products.find((p) => p.id === l.productId)?.compareAtPrice }));
      const subtotal = priced.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

      // Cupom é revalidado aqui (no backend real, no servidor).
      let coupon: { code: string; description: string; amount: Cents } | undefined;
      if (input.couponCode) {
        const result = evaluateCoupon(
          couponRepository.list().find((c) => c.code === input.couponCode),
          { subtotal, shippingCost: input.shipping.price },
        );
        if (result.ok) coupon = { code: result.coupon.code, description: result.message, amount: result.discount };
      }
      const totals = computeTotals(priced, input.shipping.price, coupon?.amount ?? 0);
      const email = normalizeEmail(input.customer?.email ?? input.contact.email);
      const order = buildOrder(
        {
          customerId: input.customer?.id ?? `visitante:${email}`,
          customerName: input.customer?.name ?? input.contact.name,
          customerEmail: email,
          guest: !input.customer,
          lines,
          address: input.address,
          coupon,
          totals,
          shipping: {
            provider: input.shipping.provider,
            isMock: input.shipping.isMock,
            serviceId: input.shipping.id,
            serviceName: input.shipping.name,
            carrier: input.shipping.carrier,
            price: input.shipping.price,
            originalPrice: input.shipping.originalPrice,
            minDays: input.shipping.minDays,
            maxDays: input.shipping.maxDays,
            estimatedFrom: input.shipping.estimate.from,
            estimatedTo: input.shipping.estimate.to,
            originZip: input.originZip || undefined,
            destinationZip: input.address.zip.replace(/\D/g, ''),
            package: input.package,
          },
        },
        orders,
      );

      commitProducts((prev) =>
        prev.map((p) => {
          const mine = input.items.filter((i) => i.productId === p.id);
          if (!mine.length) return p;
          const stock = { ...p.stock };
          for (const i of mine) stock[i.size] = Math.max(0, (stock[i.size] ?? 0) - i.quantity);
          return { ...p, stock, salesCount: p.salesCount + mine.reduce((n, i) => n + i.quantity, 0) };
        }),
      );
      commitOrders((prev) => [order, ...prev]);
      return { ok: true, order };
    },
    [products, orders, commitProducts, commitOrders],
  );

  const value = useMemo<StoreData>(
    () => ({
      hydrated,
      products,
      orders,
      customers,
      settings,
      saveProduct,
      placeOrder,
      deleteProduct: (id) => commitProducts((prev) => prev.filter((p) => p.id !== id)),
      setProductStatus: (id, status) => commitProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p))),
      setStock: (id, size, quantity) =>
        commitProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, stock: { ...p.stock, [size]: Math.max(0, Math.floor(quantity) || 0) } } : p)),
        ),
      setOrderStatus: (id, status) =>
        commitOrders((prev) =>
          prev.map((o) => {
            if (o.id !== id || o.status === status) return o;
            const events: OrderEvent[] = [...(o.history ?? [])];
            if (status !== 'pendente') events.push({ type: EVENT_FOR_STATUS[status], at: toLocalISO(), by: 'admin' });
            return { ...o, status, history: events };
          }),
        ),
      setOrderTracking: (id, tracking) =>
        commitOrders((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            if (!tracking) return { ...o, tracking: undefined };
            const at = toLocalISO();
            return {
              ...o,
              tracking: { ...tracking, addedAt: at },
              history: [...(o.history ?? []), { type: 'rastreio', at, by: 'admin', note: `Código de rastreio ${tracking.code} (${tracking.carrier})` }],
            };
          }),
        ),
      upsertCustomer: (customer) =>
        commitCustomers((prev) => (prev.some((c) => c.id === customer.id) ? prev.map((c) => (c.id === customer.id ? customer : c)) : [customer, ...prev])),
      claimGuestOrders: (customer) =>
        commitOrders((prev) =>
          prev.map((o) =>
            o.guest && o.customerEmail === normalizeEmail(customer.email) ? { ...o, guest: undefined, customerId: customer.id, customerName: customer.name } : o,
          ),
        ),
      saveSettings: (s) => {
        setSettings(s);
        void settingsRepository.save(s);
      },
      resetDemoData: async () => {
        const [p, o, c] = await Promise.all([productRepository.reset(), orderRepository.reset(), customerRepository.reset()]);
        customerAuthProvider.clearAll();
        setProducts(p);
        setOrders(o);
        setCustomers(c);
      },
    }),
    [hydrated, products, orders, customers, settings, saveProduct, placeOrder, commitProducts, commitOrders, commitCustomers],
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

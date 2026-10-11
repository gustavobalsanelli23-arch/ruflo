'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  | { ok: false; reason: 'vazio' }
  | { ok: false; reason: 'falha'; message: string };

/**
 * De onde vem o catálogo: `db` = banco da loja (sincronizado com o fornecedor,
 * estoque validado no servidor); `local` = arquivo do catálogo + localStorage
 * (sem banco configurado, como antes da integração).
 */
export type CatalogSource = 'local' | 'db';

interface StoreData {
  /** `false` até os dados locais (localStorage) serem carregados no navegador. */
  hydrated: boolean;
  catalogSource: CatalogSource;
  /** Com banco: o catálogo completo do painel já chegou (formulários só abrem depois). */
  adminCatalogLoaded: boolean;
  /** Recarrega o catálogo do servidor (`admin` inclui rascunhos e itens aguardando aprovação). */
  refreshCatalog(opts?: { admin?: boolean }): Promise<void>;
  /** Última falha ao gravar uma alteração do painel no servidor (o painel mostra um aviso). */
  adminError: { message: string; at: number } | null;
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
  /** Revalida o estoque, dá baixa (no servidor, quando há banco) e registra o pedido. */
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>;
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
  const [catalogSource, setCatalogSource] = useState<CatalogSource>('local');
  const [adminError, setAdminError] = useState<{ message: string; at: number } | null>(null);
  const [adminCatalogLoaded, setAdminCatalogLoaded] = useState(false);
  const sourceRef = useRef<CatalogSource>('local');
  const adminViewRef = useRef(false);

  const fetchCatalog = useCallback(async (admin: boolean): Promise<Product[] | null> => {
    try {
      const res = await fetch(admin ? '/api/admin/produtos' : '/api/catalogo', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) return null;
      const body = (await res.json()) as { source?: string; products?: Product[] };
      return body.source === 'db' && Array.isArray(body.products) ? body.products : null;
    } catch {
      return null;
    }
  }, []);

  const refreshCatalog = useCallback(
    async (opts: { admin?: boolean } = {}) => {
      if (opts.admin) adminViewRef.current = true;
      const admin = adminViewRef.current;
      const list = await fetchCatalog(admin);
      if (!list) return;
      sourceRef.current = 'db';
      setCatalogSource('db');
      setProducts(list);
      if (admin) setAdminCatalogLoaded(true);
    },
    [fetchCatalog],
  );

  useEffect(() => {
    let alive = true;
    Promise.all([fetchCatalog(false), orderRepository.list(), customerRepository.list(), settingsRepository.get()]).then(async ([remote, o, c, s]) => {
      // Sem banco (ou fora do ar): catálogo local, como antes da integração.
      const p = remote ?? (await productRepository.list());
      if (!alive) return;
      if (remote) {
        sourceRef.current = 'db';
        setCatalogSource('db');
      }
      setProducts((prev) => (adminViewRef.current && remote ? prev : p));
      setOrders(o);
      setCustomers(c);
      setSettings(s);
      setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, [fetchCatalog]);

  /** Grava uma alteração do painel no servidor; se falhar, avisa e recarrega o catálogo real. */
  const adminRequest = useCallback(
    async (url: string, init: RequestInit): Promise<boolean> => {
      try {
        const res = await fetch(url, { ...init, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) return true;
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setAdminError({ message: body.error ?? 'Não foi possível salvar no servidor.', at: Date.now() });
      } catch {
        setAdminError({ message: 'Sem conexão com o servidor. A alteração não foi salva.', at: Date.now() });
      }
      void refreshCatalog({ admin: true });
      return false;
    },
    [refreshCatalog],
  );

  // Digitação no estoque: só a última quantidade de cada tamanho vai ao servidor.
  const stockTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const commitProducts = useCallback((update: (prev: Product[]) => Product[]) => {
    setProducts((prev) => {
      const next = update(prev);
      // Com banco, o catálogo é do servidor: nada vai para o localStorage.
      if (sourceRef.current === 'local') void productRepository.saveAll(next);
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
      if (sourceRef.current === 'db') {
        // Só os tamanhos que o admin mudou no formulário vão ao servidor: os demais
        // ficam como estão (vendas feitas enquanto o formulário estava aberto não voltam).
        const stock = existing ? Object.fromEntries(Object.entries(input.stock).filter(([size, q]) => existing.stock[size as Size] !== q)) : input.stock;
        const body = existing ? { ...input, id: existing.id, stock } : { ...input, id: undefined };
        void adminRequest('/api/admin/produtos', { method: 'POST', body: JSON.stringify(body) }).then((ok) => {
          if (ok) void refreshCatalog({ admin: true });
        });
      }
      return product;
    },
    [products, commitProducts, adminRequest, refreshCatalog],
  );

  const placeOrder = useCallback(
    async (input: PlaceOrderInput): Promise<PlaceOrderResult> => {
      if (!input.items.length) return { ok: false, reason: 'vazio' };
      // Primeira checagem com o catálogo carregado; a definitiva é no servidor, abaixo.
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

      if (sourceRef.current === 'db') {
        // Baixa atômica no banco: se outro cliente levou o último item, nada é registrado.
        try {
          const res = await fetch('/api/pedidos/confirmar-estoque', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, items: input.items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })) }),
          });
          const body = (await res.json().catch(() => ({}))) as { issues?: StockIssue[]; error?: string };
          if (res.status === 409 && body.issues?.length) {
            void refreshCatalog();
            return { ok: false, reason: 'estoque', issues: body.issues };
          }
          if (!res.ok) return { ok: false, reason: 'falha', message: body.error ?? 'Não foi possível confirmar o pedido agora. Tente novamente.' };
        } catch {
          return { ok: false, reason: 'falha', message: 'Sem conexão. Seu pedido não foi registrado; tente novamente.' };
        }
        void refreshCatalog();
      }

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
    [products, orders, commitProducts, commitOrders, refreshCatalog],
  );

  const value = useMemo<StoreData>(
    () => ({
      hydrated,
      catalogSource,
      adminCatalogLoaded,
      refreshCatalog,
      adminError,
      products,
      orders,
      customers,
      settings,
      saveProduct,
      placeOrder,
      deleteProduct: (id) => {
        commitProducts((prev) => prev.filter((p) => p.id !== id));
        if (sourceRef.current === 'db') void adminRequest(`/api/admin/produtos/${encodeURIComponent(id)}`, { method: 'DELETE' }).then((ok) => {
          if (ok) void refreshCatalog({ admin: true });
        });
      },
      setProductStatus: (id, status) => {
        commitProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
        if (sourceRef.current === 'db') void adminRequest(`/api/admin/produtos/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      },
      setStock: (id, size, quantity) => {
        const qty = Math.max(0, Math.floor(quantity) || 0);
        commitProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: { ...p.stock, [size]: qty } } : p)));
        if (sourceRef.current !== 'db') return;
        const key = `${id}:${size}`;
        clearTimeout(stockTimers.current.get(key));
        stockTimers.current.set(
          key,
          setTimeout(() => {
            stockTimers.current.delete(key);
            void adminRequest(`/api/admin/produtos/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ size, quantity: qty }) });
          }, 500),
        );
      },
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
        // Com banco, o catálogo real (sincronizado com o fornecedor) não é "dado de exemplo".
        if (sourceRef.current === 'db') await refreshCatalog();
        else setProducts(p);
        setOrders(o);
        setCustomers(c);
      },
    }),
    [hydrated, catalogSource, adminCatalogLoaded, refreshCatalog, adminError, products, orders, customers, settings, saveProduct, placeOrder, commitProducts, commitOrders, commitCustomers, adminRequest],
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

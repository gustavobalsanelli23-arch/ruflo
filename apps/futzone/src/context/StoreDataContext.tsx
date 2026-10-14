'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Cents, Product, ProductInput, ProductStatus, Size } from '@/types/catalog';
import type { CartItem, Customer, Order, OrderEvent, OrderLine, OrderStatus, OrderTracking } from '@/types/commerce';
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
import { customerAuthProvider } from '@/services/auth/localDemo.provider';
import { buildOrder, computeTotals, EVENT_FOR_STATUS, newOrderId } from '@/lib/orders';
import { linkPriceMismatch, paymentGroups, productPriceKey } from '@/lib/paymentLinks';
import { toLocalISO } from '@/lib/format';
import { normalizeEmail } from '@/lib/validation';

export interface PlaceOrderInput {
  items: CartItem[];
  /** Conta logada; `null` = compra como visitante (usa `contact`). */
  customer: Customer | null;
  contact: { name: string; email: string; phone: string; cpf: string };
}

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: 'estoque'; issues: StockIssue[] }
  /** Preço do produto diferente do preço fixo do link da Stripe do tipo dele. */
  | { ok: false; reason: 'preco'; products: string[] }
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
  /** Pedidos deste navegador (área do cliente). */
  orders: Order[];
  /** Pedidos que o painel mostra: os do banco (com banco), senão os deste navegador. */
  adminOrders: Order[];
  customers: Customer[];
  settings: StoreSettings;
  saveProduct(input: ProductInput): Product;
  deleteProduct(id: string): void;
  setProductStatus(id: string, status: ProductStatus): void;
  setStock(id: string, size: Size, quantity: number): void;
  setOrderStatus(id: string, status: OrderStatus): void;
  setOrderTracking(id: string, tracking: Omit<OrderTracking, 'addedAt'> | null): void;
  /** Pagamento conferido na Stripe (ou desfeito) pelo painel. */
  setOrderPayment(id: string, status: 'aprovado' | 'pendente'): void;
  upsertCustomer(customer: Customer): void;
  /** Vincula pedidos feitos como visitante à conta criada com o mesmo e-mail. */
  claimGuestOrders(customer: Customer): void;
  /** Revalida estoque e preço, registra o pedido (no banco, quando há) e dá baixa no estoque. */
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>;
  saveSettings(settings: StoreSettings): void;
  resetDemoData(): Promise<void>;
}

const StoreDataContext = createContext<StoreData | null>(null);

export function StoreDataProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  /** Pedidos do banco, carregados quando o painel abre (null = sem banco ou fora do painel). */
  const [serverOrders, setServerOrders] = useState<Order[] | null>(null);
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

  const fetchServerOrders = useCallback(async (): Promise<Order[] | null> => {
    try {
      const res = await fetch('/api/admin/pedidos', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) return null;
      const body = (await res.json()) as { source?: string; orders?: Order[] };
      return body.source === 'db' && Array.isArray(body.orders) ? body.orders : null;
    } catch {
      return null;
    }
  }, []);

  const refreshCatalog = useCallback(
    async (opts: { admin?: boolean } = {}) => {
      if (opts.admin) adminViewRef.current = true;
      const admin = adminViewRef.current;
      const [list, remoteOrders] = await Promise.all([fetchCatalog(admin), admin ? fetchServerOrders() : Promise.resolve(null)]);
      if (remoteOrders) setServerOrders(remoteOrders);
      if (!list) return;
      sourceRef.current = 'db';
      setCatalogSource('db');
      setProducts(list);
      if (admin) setAdminCatalogLoaded(true);
    },
    [fetchCatalog, fetchServerOrders],
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
      const bought = input.items.map((item) => products.find((x) => x.id === item.productId)!);
      const wrongPrice = [...new Set(bought.filter(linkPriceMismatch).map((p) => p.name))];
      if (wrongPrice.length) return { ok: false, reason: 'preco', products: wrongPrice };

      const email = normalizeEmail(input.customer?.email ?? input.contact.email);
      const name = input.customer?.name ?? input.contact.name;
      const phone = input.customer?.phone ?? input.contact.phone;
      let order: Order;

      if (sourceRef.current === 'db') {
        // O servidor grava o pedido, dá a baixa atômica e numera: se outro cliente
        // levou o último item, nada é registrado.
        try {
          const res = await fetch('/api/pedidos', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: newOrderId(),
              customer: { name, email, phone, accountId: input.customer?.id },
              items: input.items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
            }),
          });
          const body = (await res.json().catch(() => ({}))) as { order?: Order; reason?: string; issues?: StockIssue[]; products?: string[]; error?: string };
          if (res.status === 409 && body.reason === 'estoque' && body.issues?.length) {
            void refreshCatalog();
            return { ok: false, reason: 'estoque', issues: body.issues };
          }
          if (res.status === 409 && body.reason === 'preco') {
            void refreshCatalog();
            return { ok: false, reason: 'preco', products: body.products ?? [] };
          }
          if (!res.ok || !body.order) return { ok: false, reason: 'falha', message: body.error ?? 'Não foi possível registrar o pedido agora. Tente novamente.' };
          order = body.order;
        } catch {
          return { ok: false, reason: 'falha', message: 'Sem conexão. Seu pedido não foi registrado; tente novamente.' };
        }
        void refreshCatalog();
      } else {
        const lines: OrderLine[] = input.items.map((item) => {
          const p = products.find((x) => x.id === item.productId)!;
          return { productId: p.id, name: p.name, size: item.size, quantity: item.quantity, unitPrice: p.price, image: p.images[0]?.src, priceKey: productPriceKey(p) };
        });
        const draft = buildOrder(
          {
            customerId: input.customer?.id ?? `visitante:${email}`,
            customerName: name,
            customerEmail: email,
            customerPhone: phone || undefined,
            guest: !input.customer,
            lines,
            totals: computeTotals(lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity, compareAtPrice: products.find((p) => p.id === l.productId)?.compareAtPrice })), null, 0),
          },
          orders,
        );
        order = {
          ...draft,
          payment: { ...draft.payment!, status: 'pendente', gateway: 'stripe', method: 'link', links: paymentGroups(lines.map((l) => ({ priceKey: l.priceKey!, quantity: l.quantity, unitPrice: l.unitPrice })), draft.number) },
        };
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
      commitOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      return { ok: true, order };
    },
    [products, orders, commitProducts, commitOrders, refreshCatalog],
  );

  /** Alteração de pedido no painel: no banco quando há (pedidos do servidor), senão local. */
  const patchServerOrder = useCallback(
    (id: string, patch: Record<string, unknown>, optimistic: (o: Order) => Order) => {
      setServerOrders((prev) => prev && prev.map((o) => (o.id === id ? optimistic(o) : o)));
      void (async () => {
        try {
          const res = await fetch(`/api/admin/pedidos/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          });
          const body = (await res.json().catch(() => ({}))) as { order?: Order; error?: string };
          if (res.ok && body.order) {
            setServerOrders((prev) => prev && prev.map((o) => (o.id === id ? body.order! : o)));
            if (patch.status === 'cancelado') void refreshCatalog({ admin: true });
            return;
          }
          setAdminError({ message: body.error ?? 'Não foi possível salvar no servidor.', at: Date.now() });
        } catch {
          setAdminError({ message: 'Sem conexão com o servidor. A alteração não foi salva.', at: Date.now() });
        }
        void refreshCatalog({ admin: true });
      })();
    },
    [refreshCatalog],
  );

  const serverMode = serverOrders !== null;

  const value = useMemo<StoreData>(
    () => ({
      hydrated,
      catalogSource,
      adminCatalogLoaded,
      refreshCatalog,
      adminError,
      products,
      orders,
      adminOrders: serverOrders ?? orders,
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
      setOrderStatus: (id, status) => {
        const apply = (o: Order): Order => {
          if (o.status === status) return o;
          const events: OrderEvent[] = [...(o.history ?? [])];
          if (status !== 'pendente') events.push({ type: EVENT_FOR_STATUS[status], at: toLocalISO(), by: 'admin' });
          return { ...o, status, history: events };
        };
        if (serverMode) patchServerOrder(id, { status }, apply);
        else commitOrders((prev) => prev.map((o) => (o.id === id ? apply(o) : o)));
      },
      setOrderTracking: (id, tracking) => {
        const apply = (o: Order): Order => {
          if (!tracking) return { ...o, tracking: undefined };
          const at = toLocalISO();
          return {
            ...o,
            tracking: { ...tracking, addedAt: at },
            history: [...(o.history ?? []), { type: 'rastreio', at, by: 'admin', note: `Código de rastreio ${tracking.code} (${tracking.carrier})` }],
          };
        };
        if (serverMode) patchServerOrder(id, { tracking: tracking ? { code: tracking.code, carrier: tracking.carrier } : null }, apply);
        else commitOrders((prev) => prev.map((o) => (o.id === id ? apply(o) : o)));
      },
      setOrderPayment: (id, status) => {
        const apply = (o: Order): Order => {
          if (o.payment?.status === status) return o;
          const at = toLocalISO();
          const history: OrderEvent[] = [...(o.history ?? [])];
          if (status === 'aprovado') history.push({ type: 'pagamento_aprovado', at, by: 'admin', note: 'Pagamento conferido na Stripe' });
          return { ...o, payment: { ...(o.payment ?? {}), status, updatedAt: at }, history };
        };
        if (serverMode) patchServerOrder(id, { paymentStatus: status }, apply);
        else commitOrders((prev) => prev.map((o) => (o.id === id ? apply(o) : o)));
      },
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
    [hydrated, catalogSource, adminCatalogLoaded, refreshCatalog, adminError, products, orders, serverOrders, serverMode, customers, settings, saveProduct, placeOrder, commitProducts, commitOrders, commitCustomers, adminRequest, patchServerOrder],
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

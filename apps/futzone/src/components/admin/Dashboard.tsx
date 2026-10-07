'use client';

import Link from 'next/link';
import { ArrowRight, CircleDollarSign, Clock, Package, PackageCheck, PackageX, ShieldCheck, ShoppingCart, Users } from 'lucide-react';
import { ORDER_STATUSES } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { formatCompactPrice, formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orders';
import { stockLevel, totalStock } from '@/lib/product';
import { OrderStatusBadge } from '@/components/orders/OrderCard';
import { ProductImage } from '@/components/products/ProductImage';
import { useAdmin } from './AdminGuard';
import { AdminCard, AdminPageHeader, AdminStats, AdminTable } from './AdminUI';
import { BarChart, StackedBar } from './AdminChart';
import { ActivityFeed } from './ActivityFeed';

const DAY = 86_400_000;

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

export function Dashboard() {
  const { products, orders, customers, settings } = useStoreData();
  const { session, previousAccess } = useAdmin();
  const threshold = settings.lowStockThreshold;

  const levels = products.map((p) => stockLevel(p, threshold));
  const available = levels.filter((l) => l !== 'esgotado').length;
  const low = levels.filter((l) => l === 'baixo').length;
  const out = levels.filter((l) => l === 'esgotado').length;
  const valid = orders.filter((o) => o.status !== 'cancelado');
  const revenue = valid.reduce((n, o) => n + o.total, 0);

  // Últimos 7 dias a partir do pedido mais recente (dados simulados).
  const latest = orders.reduce((m, o) => Math.max(m, new Date(o.createdAt).getTime()), 0);
  const end = new Date(latest || Date.now());
  end.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => new Date(end.getTime() - (6 - i) * DAY));
  const sales = days.map((d) => {
    const dayOrders = valid.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= d.getTime() && t < d.getTime() + DAY;
    });
    const total = dayOrders.reduce((n, o) => n + o.total, 0);
    return {
      key: d.toISOString(),
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: total,
      display: formatPrice(total),
      detail: `${dayOrders.length} ${dayOrders.length === 1 ? 'pedido' : 'pedidos'}`,
    };
  });

  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const attention = products
    .filter((p) => stockLevel(p, threshold) !== 'disponivel')
    .sort((a, b) => totalStock(a) - totalStock(b))
    .slice(0, 5);


  return (
    <>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-[linear-gradient(110deg,color-mix(in_oklab,var(--color-brand-600)_16%,var(--color-surface)),var(--color-surface)_60%)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-semibold text-brand-300">{greeting()}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-fg sm:text-[1.75rem]">Olá, {session.admin.name}</h1>
          <p className="mt-1 text-sm text-muted">Visão geral da loja com dados simulados.</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-right">
          <div>
            <dt className="flex items-center gap-1.5 text-muted sm:justify-end"><ShieldCheck className="size-3.5 text-brand-400" /> Conectado</dt>
            <dd className="mt-0.5 font-semibold text-fg">{session.admin.name}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-muted sm:justify-end"><Clock className="size-3.5 text-brand-400" /> Último acesso</dt>
            <dd className="mt-0.5 font-semibold text-fg">{previousAccess ? formatDateTime(previousAccess) : 'Primeiro acesso'}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <AdminStats label="Produtos cadastrados" value={String(products.length)} hint={`${products.filter((p) => p.status === 'published').length} publicados`} icon={Package} href="/admin/produtos" />
        <AdminStats label="Produtos disponíveis" value={String(available)} hint={`${low} com estoque baixo`} icon={PackageCheck} tone="success" href="/admin/estoque" />
        <AdminStats label="Sem estoque" value={String(out)} hint="esgotados" icon={PackageX} tone="danger" href="/admin/estoque" />
        <AdminStats label="Pedidos" value={String(orders.length)} hint={(() => { const n = orders.filter((o) => o.status === 'pendente').length; return `${n} ${n === 1 ? 'pendente' : 'pendentes'}`; })()} icon={ShoppingCart} href="/admin/pedidos" />
        <AdminStats label="Vendas" value={formatCompactPrice(revenue)} hint={`${valid.length} pedidos válidos`} icon={CircleDollarSign} tone="neutral" />
        <AdminStats label="Clientes" value={String(customers.length)} hint="cadastrados" icon={Users} tone="neutral" href="/admin/clientes" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
        <AdminCard title="Vendas — últimos 7 dias" description="Receita de pedidos não cancelados">
          <div className="p-5">
            <BarChart data={sales} ariaLabel="Receita por dia nos últimos 7 dias" />
          </div>
        </AdminCard>
        <div className="grid gap-4 sm:gap-6">
          <AdminCard title="Pedidos por status">
            <div className="p-5">
              <StackedBar
                unit="pedidos"
                data={ORDER_STATUSES.map((s) => ({ key: s, label: ORDER_STATUS_META[s].label, value: orders.filter((o) => o.status === s).length, color: ORDER_STATUS_META[s].color }))}
              />
            </div>
          </AdminCard>
          <AdminCard title="Situação do estoque">
            <div className="p-5">
              <StackedBar
                unit="produtos"
                data={[
                  { key: 'ok', label: 'Disponíveis', value: available - low, color: 'var(--color-success)' },
                  { key: 'low', label: 'Estoque baixo', value: low, color: 'var(--color-warn)' },
                  { key: 'out', label: 'Esgotados', value: out, color: 'var(--color-danger)' },
                ]}
              />
            </div>
          </AdminCard>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
        <AdminCard title="Pedidos recentes" action={<SeeAll href="/admin/pedidos" label="Ver todos" />}>
          <AdminTable head={['Pedido', 'Cliente', 'Data', 'Status', 'Total']} minWidth={560} caption="Pedidos recentes">
            {recent.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/pedidos/${o.id}`} className="font-bold text-brand-300 hover:underline">{o.number}</Link></td>
                <td className="text-fg-2">{o.customerName}</td>
                <td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</td>
                <td><OrderStatusBadge status={o.status} /></td>
                <td className="text-right font-bold tabular-nums">{formatPrice(o.total)}</td>
              </tr>
            ))}
          </AdminTable>
        </AdminCard>
        <div className="grid gap-4 sm:gap-6">
          <AdminCard title="Precisa de atenção" action={<SeeAll href="/admin/estoque" label="Estoque" />}>
            <ul className="divide-y divide-white/[0.05]">
              {attention.map((p) => {
                const total = totalStock(p);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <ProductImage product={p} className="size-10 shrink-0 rounded-lg" />
                    <Link href={`/admin/produtos/${p.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-brand-300">{p.name}</Link>
                    <span className={total === 0 ? 'text-xs font-bold text-danger' : 'text-xs font-bold text-warn'}>{total === 0 ? 'Esgotado' : `${total} un.`}</span>
                  </li>
                );
              })}
              {attention.length === 0 && <li className="px-5 py-6 text-sm text-muted">Nenhum produto com estoque baixo.</li>}
            </ul>
          </AdminCard>
          <AdminCard title="Atividade recente" description="Ações dos administradores neste navegador">
            <ActivityFeed limit={6} />
          </AdminCard>
        </div>
      </div>
    </>
  );
}

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300">
      {label} <ArrowRight className="size-3.5" />
    </Link>
  );
}

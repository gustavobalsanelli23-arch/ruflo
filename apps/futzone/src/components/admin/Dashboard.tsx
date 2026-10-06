'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CircleDollarSign, PackageCheck, PackageX, Package, ShoppingCart } from 'lucide-react';
import { ORDER_STATUSES } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { formatCompactPrice, formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orders';
import { stockLevel, totalStock } from '@/lib/product';
import { OrderStatusBadge } from '@/components/orders/OrderCard';
import { ProductImage } from '@/components/store/ProductImage';
import { AdminPageHeader, AdminTable, Panel, StatCard } from './AdminUI';
import { BarChart, StackedBar } from './Charts';

const DAY = 86_400_000;

export function Dashboard() {
  const { products, orders, settings } = useStoreData();
  const threshold = settings.lowStockThreshold;

  const levels = products.map((p) => stockLevel(p, threshold));
  const available = levels.filter((l) => l === 'disponivel').length;
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
      <AdminPageHeader title="Dashboard" description="Visão geral da loja com dados simulados." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-6">
        <StatCard label="Produtos" value={String(products.length)} hint={`${products.filter((p) => p.status === 'published').length} publicados`} icon={Package} />
        <StatCard label="Pedidos" value={String(orders.length)} hint={`${orders.filter((o) => o.status === 'pendente').length} pendentes`} icon={ShoppingCart} />
        <StatCard label="Disponíveis" value={String(available)} hint="estoque saudável" icon={PackageCheck} tone="success" />
        <StatCard label="Estoque baixo" value={String(low)} hint={`até ${threshold} unidades`} icon={AlertTriangle} tone="warn" />
        <StatCard label="Esgotados" value={String(out)} hint="sem unidades" icon={PackageX} tone="danger" />
        <StatCard label="Receita" value={formatCompactPrice(revenue)} hint="pedidos não cancelados" icon={CircleDollarSign} compact />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Vendas — últimos 7 dias">
          <div className="p-5">
            <BarChart data={sales} ariaLabel="Receita por dia nos últimos 7 dias" />
          </div>
        </Panel>
        <div className="grid gap-4 sm:gap-6">
          <Panel title="Pedidos por status">
            <div className="p-5">
              <StackedBar
                unit="pedidos"
                data={ORDER_STATUSES.map((s) => ({ key: s, label: ORDER_STATUS_META[s].label, value: orders.filter((o) => o.status === s).length, color: ORDER_STATUS_META[s].color }))}
              />
            </div>
          </Panel>
          <Panel title="Situação do estoque">
            <div className="p-5">
              <StackedBar
                unit="produtos"
                data={[
                  { key: 'ok', label: 'Disponíveis', value: available, color: 'var(--color-success)' },
                  { key: 'low', label: 'Estoque baixo', value: low, color: 'var(--color-warn)' },
                  { key: 'out', label: 'Esgotados', value: out, color: 'var(--color-danger)' },
                ]}
              />
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Pedidos recentes" action={<Link href="/admin/pedidos" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">Ver todos <ArrowRight className="size-3.5" /></Link>}>
          <AdminTable head={['Pedido', 'Cliente', 'Data', 'Status', 'Total']} minWidth={560}>
            {recent.map((o) => (
              <tr key={o.id} className="hover:bg-surface-2/50">
                <td className="font-bold text-brand-300">{o.number}</td>
                <td className="text-fg-2">{o.customerName}</td>
                <td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</td>
                <td><OrderStatusBadge status={o.status} /></td>
                <td className="text-right font-bold tabular-nums">{formatPrice(o.total)}</td>
              </tr>
            ))}
          </AdminTable>
        </Panel>
        <Panel title="Precisa de atenção" action={<Link href="/admin/estoque" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">Estoque <ArrowRight className="size-3.5" /></Link>}>
          <ul className="divide-y divide-line">
            {attention.map((p) => {
              const total = totalStock(p);
              return (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <ProductImage product={p} className="size-11 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <span className={total === 0 ? 'text-xs font-bold text-danger' : 'text-xs font-bold text-warn'}>{total === 0 ? 'Esgotado' : `${total} un.`}</span>
                </li>
              );
            })}
            {attention.length === 0 && <li className="px-5 py-6 text-sm text-muted">Nenhum produto com estoque baixo.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}

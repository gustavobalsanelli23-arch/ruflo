'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/commerce';
import { ORDER_STATUSES } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { cn, formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orders';
import { DemoNotice, EmptyState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { OrderCard, OrderStatusBadge } from '@/components/orders/OrderCard';
import { AdminPageHeader, AdminTable, Panel } from './AdminUI';

type Filter = OrderStatus | 'todos';

export function OrdersAdmin() {
  const { orders, setOrderStatus } = useStoreData();
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>('todos');
  const [q, setQ] = useState('');

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: orders.length, pendente: 0, preparacao: 0, enviado: 0, entregue: 0, cancelado: 0 };
    orders.forEach((o) => c[o.status]++);
    return c;
  }, [orders]);

  const list = orders
    .filter((o) => (filter === 'todos' || o.status === filter) && `${o.number} ${o.customerName}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const change = (o: Order, status: OrderStatus) => {
    setOrderStatus(o.id, status);
    notify(`${o.number}: status alterado para "${ORDER_STATUS_META[status].label}".`);
  };

  const statusSelect = (o: Order) => (
    <Select value={o.status} onChange={(e) => change(o, e.target.value as OrderStatus)} className="h-9 w-40 rounded-lg text-xs" aria-label={`Alterar status do pedido ${o.number}`}>
      {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>)}
    </Select>
  );

  const tabs: Filter[] = ['todos', ...ORDER_STATUSES];

  return (
    <>
      <AdminPageHeader title="Pedidos" description="Pedidos simulados — sem processamento real de pagamento ou envio." />
      <DemoNotice className="mb-6">A alteração de status é apenas local, para demonstrar o fluxo de gestão. Nenhum cliente é notificado.</DemoNotice>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filtrar por status">
        {tabs.map((t) => {
          const active = filter === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(t)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                active ? 'border-brand-500 bg-brand-500 text-white' : 'border-line text-fg-2 hover:border-line-strong hover:text-fg',
              )}
            >
              {t !== 'todos' && <span className="size-2 rounded-full" style={{ background: ORDER_STATUS_META[t].color }} aria-hidden />}
              {t === 'todos' ? 'Todos' : ORDER_STATUS_META[t].label}
              <span className={cn('rounded-full px-1.5 text-[0.65rem]', active ? 'bg-white/20' : 'bg-surface-3')}>{counts[t]}</span>
            </button>
          );
        })}
      </div>

      <Panel>
        <div className="border-b border-line p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número ou cliente" aria-label="Buscar pedidos" className="h-11 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
        </div>
        {list.length === 0 ? (
          <EmptyState className="m-4" title="Nenhum pedido neste filtro" />
        ) : (
          <>
            <div className="hidden lg:block">
              <AdminTable head={['Pedido', 'Cliente', 'Produtos', 'Total', 'Status', 'Data', 'Alterar status']} minWidth={960}>
                {list.map((o) => (
                  <tr key={o.id} className="align-top hover:bg-surface-2/50">
                    <td className="font-bold text-brand-300">{o.number}</td>
                    <td className="text-fg-2">{o.customerName}</td>
                    <td className="max-w-72">
                      <ul className="space-y-0.5 text-xs text-fg-2">
                        {o.lines.map((l) => (
                          <li key={l.productId + l.size} className="truncate">{l.quantity}× {l.name} <span className="text-muted">({l.size})</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="font-bold tabular-nums">{formatPrice(o.total)}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</td>
                    <td>{statusSelect(o)}</td>
                  </tr>
                ))}
              </AdminTable>
            </div>
            <div className="space-y-3 p-4 lg:hidden">
              {list.map((o) => (
                <OrderCard key={o.id} order={o} showCustomer actions={<label className="flex items-center gap-3 text-xs text-muted">Alterar status {statusSelect(o)}</label>} />
              ))}
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

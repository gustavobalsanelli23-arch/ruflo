'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Order, OrderStatus } from '@/types/commerce';
import { ORDER_STATUSES } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { formatDateTime, formatPrice } from '@/lib/format';
import { ORDER_STATUS_META } from '@/lib/orders';
import { DemoNotice, EmptyState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { OrderCard, OrderStatusBadge } from '@/components/orders/OrderCard';
import { AdminCard, AdminSearch, AdminTabs, AdminPageHeader, AdminTable } from './AdminUI';
import { useAdmin } from './AdminGuard';

type Filter = OrderStatus | 'todos';

export function OrdersAdmin() {
  const { orders, setOrderStatus } = useStoreData();
  const { log } = useAdmin();
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
    log('pedido', `alterou o pedido ${o.number} para "${ORDER_STATUS_META[status].label}"`);
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

      <div className="mb-4">
        <AdminTabs<Filter>
          label="Filtrar por status"
          value={filter}
          onChange={setFilter}
          tabs={tabs.map((t) => ({ id: t, label: t === 'todos' ? 'Todos' : ORDER_STATUS_META[t].label, count: counts[t], color: t === 'todos' ? undefined : ORDER_STATUS_META[t].color }))}
        />
      </div>

      <AdminCard>
        <div className="border-b border-white/[0.06] p-4">
          <AdminSearch value={q} onChange={setQ} placeholder="Buscar por número ou cliente" label="Buscar pedidos" />
        </div>
        {list.length === 0 ? (
          <EmptyState className="m-4" title="Nenhum pedido neste filtro" />
        ) : (
          <>
            <div className="hidden lg:block">
              <AdminTable head={['Pedido', 'Cliente', 'Data', 'Produtos', 'Valor', 'Status', 'Alterar status']} minWidth={960}>
                {list.map((o) => (
                  <tr key={o.id} className="align-top hover:bg-surface-2/50">
                    <td><Link href={`/admin/pedidos/${o.id}`} className="font-bold text-brand-300 hover:underline">{o.number}</Link></td>
                    <td className="text-fg-2">{o.customerName}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(o.createdAt)}</td>
                    <td className="max-w-72">
                      <ul className="space-y-0.5 text-xs text-fg-2">
                        {o.lines.map((l) => (
                          <li key={l.productId + l.size} className="truncate">{l.quantity}× {l.name} <span className="text-muted">({l.size})</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="font-bold tabular-nums">{formatPrice(o.total)}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td>{statusSelect(o)}</td>
                  </tr>
                ))}
              </AdminTable>
            </div>
            <div className="space-y-3 p-4 lg:hidden">
              {list.map((o) => (
                <OrderCard key={o.id} order={o} showCustomer actions={<div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-3 text-xs text-muted">Status {statusSelect(o)}</label><Link href={`/admin/pedidos/${o.id}`} className="text-xs font-semibold text-brand-400">Ver detalhes →</Link></div>} />
              ))}
            </div>
          </>
        )}
      </AdminCard>
    </>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { Customer, Order } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { formatDate, formatPrice } from '@/lib/format';
import { EmptyState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import type { BadgeTone } from '@/components/ui/Badge';
import { AdminAvatar, AdminBadge, AdminCard, AdminPageHeader, AdminSearch, AdminTable, AdminTabs, initialsOf } from './AdminUI';

type CustomerStatus = 'ativo' | 'inativo' | 'novo';
type Filter = CustomerStatus | 'todos';
type Sort = 'recentes' | 'gasto' | 'pedidos' | 'nome';

const STATUS_META: Record<CustomerStatus, { label: string; tone: BadgeTone }> = {
  ativo: { label: 'Ativo', tone: 'success' },
  novo: { label: 'Sem pedidos', tone: 'brand' },
  inativo: { label: 'Inativo', tone: 'neutral' },
};

const DAY = 86_400_000;

/** Ativo: comprou nos últimos 90 dias (relativo ao pedido mais recente da base simulada). */
function statusOf(orders: Order[], reference: number): CustomerStatus {
  if (orders.length === 0) return 'novo';
  const last = Math.max(...orders.map((o) => new Date(o.createdAt).getTime()));
  return reference - last <= 90 * DAY ? 'ativo' : 'inativo';
}

interface Row {
  customer: Customer;
  orders: number;
  spent: number;
  status: CustomerStatus;
}

export function CustomersAdmin() {
  const { customers, orders } = useStoreData();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [sort, setSort] = useState<Sort>('recentes');

  const rows = useMemo<Row[]>(() => {
    const reference = orders.reduce((m, o) => Math.max(m, new Date(o.createdAt).getTime()), 0) || Date.now();
    return customers.map((c) => {
      const mine = orders.filter((o) => o.customerId === c.id);
      return {
        customer: c,
        orders: mine.length,
        spent: mine.filter((o) => o.status !== 'cancelado').reduce((n, o) => n + o.total, 0),
        status: statusOf(mine, reference),
      };
    });
  }, [customers, orders]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: rows.length, ativo: 0, novo: 0, inativo: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const term = q.trim().toLowerCase();
  const list = rows
    .filter((r) => (filter === 'todos' || r.status === filter) && `${r.customer.name} ${r.customer.email} ${r.customer.city}`.toLowerCase().includes(term))
    .sort((a, b) =>
      sort === 'gasto' ? b.spent - a.spent : sort === 'pedidos' ? b.orders - a.orders : sort === 'nome' ? a.customer.name.localeCompare(b.customer.name) : b.customer.createdAt.localeCompare(a.customer.createdAt),
    );

  return (
    <>
      <AdminPageHeader title="Clientes" description={`${customers.length} clientes (dados simulados)`} />
      <div className="mb-4">
        <AdminTabs<Filter>
          label="Filtrar clientes por status"
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: 'todos', label: 'Todos', count: counts.todos },
            { id: 'ativo', label: 'Ativos', count: counts.ativo },
            { id: 'novo', label: 'Sem pedidos', count: counts.novo },
            { id: 'inativo', label: 'Inativos', count: counts.inativo },
          ]}
        />
      </div>
      <AdminCard>
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center">
          <AdminSearch value={q} onChange={setQ} placeholder="Buscar por nome, e-mail ou cidade" label="Buscar clientes" className="flex-1 sm:max-w-md" />
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar clientes" className="h-10 rounded-lg sm:w-48">
            <option value="recentes">Cadastro mais recente</option>
            <option value="gasto">Maior total gasto</option>
            <option value="pedidos">Mais pedidos</option>
            <option value="nome">Nome (A–Z)</option>
          </Select>
        </div>
        {list.length === 0 ? (
          <EmptyState className="m-4" title="Nenhum cliente encontrado" description="Ajuste a busca ou o filtro." />
        ) : (
          <>
            <div className="hidden md:block">
              <AdminTable head={['Cliente', 'E-mail', 'Pedidos', 'Total gasto', 'Cadastro', 'Status']} minWidth={820} caption="Clientes">
                {list.map(({ customer: c, orders: n, spent, status }) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <AdminAvatar initials={initialsOf(c.name)} className="size-8 bg-white/[0.08] text-fg-2 ring-0" />
                        <span>
                          <span className="block font-semibold">{c.name}</span>
                          <span className="text-xs text-muted">{c.city}/{c.state}</span>
                        </span>
                      </div>
                    </td>
                    <td className="text-fg-2">{c.email}</td>
                    <td className="font-bold tabular-nums">{n}</td>
                    <td className="tabular-nums">{formatPrice(spent)}</td>
                    <td className="text-muted">{formatDate(c.createdAt)}</td>
                    <td><AdminBadge tone={STATUS_META[status].tone}>{STATUS_META[status].label}</AdminBadge></td>
                  </tr>
                ))}
              </AdminTable>
            </div>
            <ul className="divide-y divide-white/[0.05] md:hidden">
              {list.map(({ customer: c, orders: n, spent, status }) => (
                <li key={c.id} className="flex items-start gap-3 p-4">
                  <AdminAvatar initials={initialsOf(c.name)} className="size-9 bg-white/[0.08] text-fg-2 ring-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <AdminBadge tone={STATUS_META[status].tone}>{STATUS_META[status].label}</AdminBadge>
                    </div>
                    <p className="truncate text-xs text-muted">{c.email}</p>
                    <p className="mt-1.5 text-xs text-fg-2">
                      {n} {n === 1 ? 'pedido' : 'pedidos'} · {formatPrice(spent)} · desde {formatDate(c.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </AdminCard>
    </>
  );
}

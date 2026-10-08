'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarDays, IdCard, Mail, MapPin, Phone, Receipt, ShoppingCart, Wallet } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { formatDate, formatPrice } from '@/lib/format';
import { formatAddress, ORDER_STATUS_META, orderItemsCount } from '@/lib/orders';
import { formatPhone, maskCPF } from '@/lib/validation';
import { DemoNotice, EmptyState } from '@/components/ui/Feedback';
import { AdminAvatar, AdminBadge, AdminCard, AdminLinkButton, AdminPageHeader, AdminStats, initialsOf } from './AdminUI';

export function CustomerDetailAdmin({ id }: { id: string }) {
  const { customers, orders, hydrated } = useStoreData();
  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    if (!hydrated) return <div className="h-96 animate-pulse rounded-2xl bg-surface" aria-busy="true" />;
    return <EmptyState title="Cliente não encontrado" description="Ele pode ter sido removido dos dados de exemplo." action={<AdminLinkButton href="/admin/clientes">Voltar aos clientes</AdminLinkButton>} />;
  }

  const mine = orders.filter((o) => o.customerId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const valid = mine.filter((o) => o.status !== 'cancelado');
  const spent = valid.reduce((n, o) => n + o.total, 0);

  return (
    <>
      <Link href="/admin/clientes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Clientes
      </Link>
      <AdminPageHeader
        title={customer.name}
        description={`Cliente desde ${formatDate(customer.createdAt)} · ${customer.origin === 'cadastro' ? 'cadastrou-se na loja' : 'dado de exemplo'}`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-3">
        <AdminStats label="Pedidos" value={String(mine.length)} icon={ShoppingCart} />
        <AdminStats label="Total gasto" value={formatPrice(spent)} icon={Wallet} tone="success" />
        <AdminStats label="Ticket médio" value={valid.length ? formatPrice(Math.round(spent / valid.length)) : '—'} icon={Receipt} tone="neutral" />
      </div>

      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-4 sm:space-y-6">
          <AdminCard title="Dados do cliente">
            <div className="flex items-center gap-3 border-b border-white/[0.06] p-5">
              <AdminAvatar initials={initialsOf(customer.name)} className="size-11" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{customer.name}</p>
                <p className="text-xs text-muted">{customer.city}/{customer.state}</p>
              </div>
            </div>
            <dl className="space-y-2.5 p-5 text-sm">
              <div className="flex items-center gap-2 text-fg-2"><Mail className="size-4 text-muted" /><dt className="sr-only">E-mail</dt><dd className="truncate">{customer.email}</dd></div>
              <div className="flex items-center gap-2 text-fg-2"><Phone className="size-4 text-muted" /><dt className="sr-only">Celular</dt><dd>{formatPhone(customer.phone)}</dd></div>
              <div className="flex items-center gap-2 text-fg-2"><IdCard className="size-4 text-muted" /><dt className="sr-only">CPF</dt><dd>{customer.cpf ? maskCPF(customer.cpf) : 'Não informado'}</dd></div>
              {customer.birthDate && (
                <div className="flex items-center gap-2 text-fg-2"><CalendarDays className="size-4 text-muted" /><dt className="sr-only">Nascimento</dt><dd>{formatDate(customer.birthDate)}</dd></div>
              )}
            </dl>
          </AdminCard>

          <AdminCard title="Endereços" description={`${customer.addresses.length} ${customer.addresses.length === 1 ? 'endereço salvo' : 'endereços salvos'}`}>
            {customer.addresses.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">Nenhum endereço cadastrado.</p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="flex gap-3 px-5 py-4 text-sm">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {a.label}
                        {a.isDefault && <AdminBadge tone="brand" dot={false}>Principal</AdminBadge>}
                      </p>
                      <p className="text-fg-2">{a.recipient}</p>
                      <p className="text-fg-2">{formatAddress(a)}</p>
                      {a.reference && <p className="text-xs text-muted">Referência: {a.reference}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        <AdminCard title="Pedidos">
          {mine.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">Este cliente ainda não fez pedidos.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {mine.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.03]">
                    <span className="font-semibold">{o.number}</span>
                    <span className="text-muted">{formatDate(o.createdAt)}</span>
                    <span className="text-muted">{orderItemsCount(o)} {orderItemsCount(o) === 1 ? 'item' : 'itens'}</span>
                    {o.shipping && <span className="text-muted">{o.shipping.serviceName}</span>}
                    <span className="ml-auto flex items-center gap-3">
                      <AdminBadge tone={ORDER_STATUS_META[o.status].tone}>{ORDER_STATUS_META[o.status].label}</AdminBadge>
                      <span className="font-bold tabular-nums">{formatPrice(o.total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
      <DemoNotice className="mt-6">Dados exibidos a partir deste navegador. CPF aparece mascarado; com banco de dados, o acesso a dados pessoais deve ser registrado e restrito.</DemoNotice>
    </>
  );
}

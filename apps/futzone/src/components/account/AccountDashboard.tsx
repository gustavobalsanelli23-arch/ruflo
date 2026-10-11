'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useCurrentCustomer } from '@/context/CustomerAuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useCustomerNotifications, useCustomerOrders } from '@/hooks/useAccountData';
import { cn, formatDate, formatDateTime } from '@/lib/format';
import { LinkButton } from '@/components/ui/Button';
import { OrderLocker } from '@/components/orders/OrderLocker';
import { AccountHeading, AddressLines, ShelfTitle, TEXT_LINK } from './AccountUI';

/**
 * Painel da conta: o último pedido como armário e, abaixo, os dados reais em
 * linhas de texto (notificações, endereço principal e a contagem de cada
 * área). Sem blocos de métricas.
 */
export function AccountDashboard() {
  const customer = useCurrentCustomer();
  const orders = useCustomerOrders();
  const { ids: favorites } = useFavorites();
  const { list: notifications, unread, markRead } = useCustomerNotifications();
  const last = orders[0];
  const address = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];

  const ledger = [
    { label: 'Pedidos', value: orders.length, href: '/conta/pedidos' },
    { label: 'Favoritos', value: favorites.length, href: '/conta/favoritos' },
    { label: 'Endereços salvos', value: customer.addresses.length, href: '/conta/enderecos' },
    { label: 'Notificações não lidas', value: unread, href: '/conta/notificacoes' },
  ];

  return (
    <div>
      <AccountHeading title="Minha conta" description={`${customer.name}, cliente desde ${formatDate(customer.createdAt)}.`} />

      <section>
        <ShelfTitle
          title="Último pedido"
          action={
            last && (
              <Link href="/conta/pedidos" className={TEXT_LINK}>
                Todos
              </Link>
            )
          }
        />
        {last ? (
          <OrderLocker order={last} headingLevel="h3" />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-dashed border-line-strong px-5 py-5">
            <p className="text-sm text-muted">Você ainda não fez nenhum pedido.</p>
            <LinkButton href="/camisas" size="sm">
              Ver camisas
            </LinkButton>
          </div>
        )}
      </section>

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0 space-y-14">
          <section>
            <ShelfTitle
              title="Notificações"
              action={
                <Link href="/conta/notificacoes" className={TEXT_LINK}>
                  Ver todas
                </Link>
              }
            />
            {notifications.length ? (
              <ul className="-mt-2 divide-y divide-line">
                {notifications.slice(0, 3).map((n) => (
                  <li key={n.id}>
                    <Link href={`/conta/pedidos/${n.orderId}`} onClick={() => markRead([n.id])} className="group grid grid-cols-[7px_minmax(0,1fr)] gap-x-3.5 py-3.5">
                      {/* Lâmpada acesa = ainda não lida */}
                      <span aria-hidden className={cn('mt-[0.4rem] size-[7px] rounded-[1px]', !n.read && 'bg-light')} />
                      <span className="min-w-0">
                        <span className={cn('block text-sm underline-offset-4 group-hover:underline', n.read ? 'text-fg-2' : 'font-semibold text-fg')}>{n.title}</span>
                        <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                          <span>{n.message}</span>
                          <span className="tabular-nums">{formatDateTime(n.at)}</span>
                        </span>
                        {!n.read && <span className="sr-only">(não lida)</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Sem notificações por enquanto.</p>
            )}
          </section>

          <section>
            <ShelfTitle
              title="Endereço principal"
              action={
                <Link href="/conta/enderecos" className={TEXT_LINK}>
                  Gerenciar
                </Link>
              }
            />
            {address ? (
              <div className="text-sm">
                <p className="plate text-[0.82rem] text-fg-2">{address.label}</p>
                <p className="mt-2 font-semibold text-fg">{address.recipient}</p>
                <AddressLines address={address} className="mt-0.5 text-fg-2" />
              </div>
            ) : (
              <p className="max-w-[52ch] text-sm text-muted">Nenhum endereço cadastrado ainda. Adicione um para agilizar suas compras.</p>
            )}
          </section>
        </div>

        <section className="min-w-0">
          <ShelfTitle title="Atalhos" />
          <ul className="-mt-2 divide-y divide-line">
            {ledger.map((row) => (
              <li key={row.href}>
                <Link href={row.href} className="group flex items-baseline justify-between gap-4 py-3.5 text-sm">
                  <span className="text-fg-2 underline-offset-4 transition-colors duration-150 group-hover:text-fg group-hover:underline">{row.label}</span>
                  <span className="font-semibold tabular-nums text-fg">{row.value}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/camisas" className="group flex items-center justify-between gap-4 py-3.5 text-sm">
                <span className="font-semibold text-fg underline-offset-4 group-hover:underline">Continuar comprando</span>
                <ArrowRight
                  className="motion-lift size-4 text-muted transition-[translate,color] duration-150 ease-[var(--ease-out-fz)] group-hover:translate-x-0.5 group-hover:text-fg"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

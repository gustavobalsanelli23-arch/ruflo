'use client';

import Link from 'next/link';
import { ArrowRight, Bell, Heart, MapPin, Package, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { useCurrentCustomer } from '@/context/CustomerAuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useCustomerNotifications, useCustomerOrders } from '@/hooks/useAccountData';
import { formatDate, formatDateTime, formatPrice } from '@/lib/format';
import { formatAddress } from '@/lib/orders';
import { LinkButton } from '@/components/ui/Button';
import { OrderStatusBadge } from '@/components/orders/OrderCard';
import { OrderProgress } from '@/components/orders/OrderTimeline';

export function AccountDashboard() {
  const customer = useCurrentCustomer();
  const orders = useCustomerOrders();
  const { ids: favorites } = useFavorites();
  const { list: notifications, unread } = useCustomerNotifications();
  const last = orders[0];
  const address = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];

  const stats = [
    { icon: Package, label: 'Pedidos', value: orders.length, href: '/conta/pedidos' },
    { icon: Heart, label: 'Favoritos', value: favorites.length, href: '/conta/favoritos' },
    { icon: MapPin, label: 'Endereços', value: customer.addresses.length, href: '/conta/enderecos' },
    { icon: Bell, label: 'Não lidas', value: unread, href: '/conta/notificacoes' },
  ];

  const shortcuts = [
    { icon: Package, label: 'Meus pedidos', href: '/conta/pedidos' },
    { icon: MapPin, label: 'Meus endereços', href: '/conta/enderecos' },
    { icon: UserRound, label: 'Dados pessoais', href: '/conta/perfil' },
    { icon: ShieldCheck, label: 'Segurança', href: '/conta/seguranca' },
    { icon: Heart, label: 'Favoritos', href: '/conta/favoritos' },
    { icon: ShoppingBag, label: 'Continuar comprando', href: '/camisas' },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <h2 className="heading-display text-4xl sm:text-5xl">Olá, {customer.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-muted">Cliente desde {formatDate(customer.createdAt)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href} className="group rounded-2xl bg-surface p-4 ring-1 ring-white/[0.06] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:ring-brand-500/40">
            <Icon className="size-5 text-brand-400" />
            <p className="heading-display mt-3 text-4xl tabular-nums">{value}</p>
            <p className="text-xs uppercase tracking-wider text-muted group-hover:text-fg-2">{label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider">Último pedido</h3>
          {last && (
            <Link href="/conta/pedidos" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">
              Todos <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
        {last ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-fg">{last.number}</p>
                <p className="text-xs text-muted">{formatDateTime(last.createdAt)} · {formatPrice(last.total)}</p>
              </div>
              <OrderStatusBadge status={last.status} />
            </div>
            <OrderProgress order={last} />
            <LinkButton href={`/conta/pedidos/${last.id}`} size="sm" variant="secondary">
              Ver pedido <ArrowRight className="size-3.5" />
            </LinkButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Você ainda não fez nenhum pedido.</p>
            <LinkButton href="/camisas" size="sm">Ver camisas</LinkButton>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">Endereço principal</h3>
            <Link href="/conta/enderecos" className="text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">Gerenciar</Link>
          </div>
          {address ? (
            <>
              <p className="text-sm font-semibold text-fg">{address.recipient}</p>
              <p className="mt-1 text-sm text-fg-2">{formatAddress(address)}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Nenhum endereço cadastrado ainda. Adicione um para agilizar suas compras.</p>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">Notificações</h3>
            <Link href="/conta/notificacoes" className="text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">Ver todas</Link>
          </div>
          {notifications.length ? (
            <ul className="space-y-3">
              {notifications.slice(0, 3).map((n) => (
                <li key={n.id} className="flex gap-3 text-sm">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? 'bg-white/15' : 'bg-brand-400'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-semibold text-fg">{n.title}</span>
                    <span className="text-xs text-muted">{n.message} · {formatDateTime(n.at)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sem notificações por enquanto.</p>
          )}
        </section>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider">Atalhos</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shortcuts.map(({ icon: Icon, label, href }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3.5 text-sm font-semibold text-fg-2 ring-1 ring-white/[0.06] transition-colors hover:text-fg hover:ring-brand-500/40">
              <Icon className="size-4 shrink-0 text-brand-400" /> {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

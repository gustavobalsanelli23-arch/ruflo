'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Package, ShoppingBag } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useCart } from '@/context/CartContext';
import { formatDate, formatPrice } from '@/lib/format';
import { EmptyState } from '@/components/ui/Feedback';
import { LinkButton } from '@/components/ui/Button';
import { OrderCard } from '@/components/orders/OrderCard';

function useCustomerOrders() {
  const { orders, customer } = useStoreData();
  return orders.filter((o) => o.customerId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function AccountOverview() {
  const { customer } = useStoreData();
  const { count } = useCart();
  const orders = useCustomerOrders();
  const address = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];
  const spent = orders.filter((o) => o.status !== 'cancelado').reduce((n, o) => n + o.total, 0);

  const cards = [
    { icon: Package, label: 'Pedidos', value: String(orders.length), href: '/conta/pedidos' },
    { icon: ShoppingBag, label: 'No carrinho', value: String(count), href: '/carrinho' },
    { icon: MapPin, label: 'Endereços', value: String(customer.addresses.length), href: '/conta/enderecos' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="heading-display text-4xl">Olá, {customer.name.split(' ')[0]}</h2>
        <p className="mt-1 text-sm text-muted">Cliente desde {formatDate(customer.createdAt)} · {formatPrice(spent)} em compras simuladas</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href} className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand-500/60">
            <Icon className="size-5 text-brand-400" />
            <p className="heading-display mt-4 text-4xl">{value}</p>
            <p className="text-xs uppercase tracking-wider text-muted group-hover:text-fg-2">{label}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider">Último pedido</h3>
          <Link href="/conta/pedidos" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">
            Ver todos <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {orders[0] ? <OrderCard order={orders[0]} /> : <p className="text-sm text-muted">Nenhum pedido ainda.</p>}
      </section>

      {address && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">Endereço principal</h3>
            <Link href="/conta/enderecos" className="text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">Gerenciar</Link>
          </div>
          <p className="text-sm text-fg-2">
            {address.street}, {address.number}
            {address.complement && ` — ${address.complement}`} · {address.district} · {address.city}/{address.state} · {address.zip}
          </p>
        </section>
      )}
    </div>
  );
}

export function AccountOrders() {
  const orders = useCustomerOrders();
  if (orders.length === 0) {
    return <EmptyState icon={<Package className="size-6" />} title="Você ainda não tem pedidos" action={<LinkButton href="/camisas">Ver camisas</LinkButton>} />;
  }
  return (
    <div className="space-y-3">
      <h2 className="heading-display mb-4 text-4xl">Meus pedidos</h2>
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}

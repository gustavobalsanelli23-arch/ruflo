'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Heart, LayoutGrid, LogOut, MapPin, Package, ShieldCheck, UserRound } from 'lucide-react';
import { accountNav } from '@/data/site';
import { useCustomerAuth, useCurrentCustomer } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { useCustomerNotifications } from '@/hooks/useAccountData';
import { cn } from '@/lib/format';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '/conta': LayoutGrid,
  '/conta/pedidos': Package,
  '/conta/enderecos': MapPin,
  '/conta/perfil': UserRound,
  '/conta/seguranca': ShieldCheck,
  '/conta/favoritos': Heart,
  '/conta/notificacoes': Bell,
};

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0]!.toUpperCase())
    .slice(0, 2)
    .join('');

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const customer = useCurrentCustomer();
  const { logout } = useCustomerAuth();
  const { notify } = useToast();
  const { unread } = useCustomerNotifications();

  const signOut = async () => {
    await logout();
    notify('Você saiu da sua conta.', 'info');
    router.replace('/');
  };

  return (
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-white/[0.06]">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-500 text-lg font-bold text-white">{initialsOf(customer.name)}</span>
        <div className="min-w-0">
          <p className="truncate font-bold">{customer.name}</p>
          <p className="truncate text-xs text-muted">{customer.email}</p>
        </div>
      </div>
      <nav aria-label="Minha conta">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0 lg:flex-col lg:gap-1 lg:overflow-visible">
          {accountNav.map((link) => {
            const Icon = ICONS[link.href] ?? LayoutGrid;
            const active = link.href === '/conta' ? pathname === '/conta' : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'bg-brand-500/15 text-fg ring-1 ring-brand-500/40' : 'text-fg-2 hover:bg-white/[0.04] hover:text-fg',
                  )}
                >
                  <Icon className={cn('size-4', active ? 'text-brand-400' : 'text-muted')} />
                  {link.label}
                  {link.href === '/conta/notificacoes' && unread > 0 && (
                    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-brand-500 px-1.5 text-[0.65rem] leading-5 text-white" aria-label={`${unread} não lidas`}>
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li className="shrink-0 lg:mt-2 lg:border-t lg:border-white/[0.06] lg:pt-2">
            <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-fg-2 transition-colors hover:bg-danger/10 hover:text-danger">
              <LogOut className="size-4" /> Sair
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, LayoutDashboard, Package, Settings, Shapes, ShoppingCart, Store, Users } from 'lucide-react';
import { cn } from '@/lib/format';
import { Logo } from '@/components/brand/Logo';

export const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Produtos', href: '/admin/produtos', icon: Package },
  { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  { label: 'Estoque', href: '/admin/estoque', icon: Boxes },
  { label: 'Clientes', href: '/admin/clientes', icon: Users },
  { label: 'Categorias', href: '/admin/categorias', icon: Shapes },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
];

export const isAdminActive = (href: string, pathname: string) =>
  href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);

export function AdminSidebar({ onNavigate }: { onNavigate?(): void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-line px-5">
        <Logo href="/admin" imgClassName="h-6 sm:h-6" />
        <span className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-brand-300">Admin</span>
      </div>
      <nav aria-label="Administração" className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-subtle">Gestão</p>
        <ul className="space-y-1">
          {ADMIN_NAV.map(({ label, href, icon: Icon }) => {
            const active = isAdminActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'bg-brand-500/15 text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {active && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" />}
                  <Icon className={cn('size-4.5', active ? 'text-brand-400' : 'text-muted')} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-line p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-2 hover:bg-surface-2 hover:text-fg">
          <Store className="size-4 text-brand-400" /> Ver loja
        </Link>
      </div>
    </div>
  );
}

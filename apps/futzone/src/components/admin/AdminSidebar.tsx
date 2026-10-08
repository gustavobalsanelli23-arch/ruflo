'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, ExternalLink, LayoutDashboard, Package, Settings, Shapes, ShoppingCart, TicketPercent, Truck, Users } from 'lucide-react';
import { cn } from '@/lib/format';
import { Logo } from '@/components/brand/Logo';

export const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Produtos', href: '/admin/produtos', icon: Package },
  { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  { label: 'Estoque', href: '/admin/estoque', icon: Boxes },
  { label: 'Clientes', href: '/admin/clientes', icon: Users },
  { label: 'Fretes', href: '/admin/fretes', icon: Truck },
  { label: 'Cupons', href: '/admin/cupons', icon: TicketPercent },
  { label: 'Categorias', href: '/admin/categorias', icon: Shapes },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
];

export const isAdminActive = (href: string, pathname: string) =>
  href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);

export function AdminSidebar({ onNavigate }: { onNavigate?(): void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Logo href="/admin" imgClassName="h-6 sm:h-6" />
        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-fg-2">Painel</span>
      </div>
      <nav aria-label="Administração" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-subtle">Gestão</p>
        <ul className="space-y-0.5">
          {ADMIN_NAV.map(({ label, href, icon: Icon }) => {
            const active = isAdminActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                    active ? 'bg-brand-500/12 text-fg' : 'text-fg-2 hover:bg-white/[0.04] hover:text-fg',
                  )}
                >
                  {active && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" aria-hidden />}
                  <Icon className={cn('size-4', active ? 'text-brand-400' : 'text-muted')} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/[0.04] hover:text-fg">
          <ExternalLink className="size-4" /> Abrir loja
        </a>
      </div>
    </div>
  );
}

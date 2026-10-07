'use client';

import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useAdmin } from './AdminGuard';
import { ADMIN_NAV, isAdminActive } from './AdminSidebar';
import { AdminButton } from './AdminUI';
import { AdminUserMenu } from './AdminUserMenu';

export function AdminHeader({ onMenu }: { onMenu(): void }) {
  const pathname = usePathname();
  const { settings } = useStoreData();
  const { logout, loggingOut } = useAdmin();
  const current = ADMIN_NAV.find((n) => isAdminActive(n.href, pathname));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-bg/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button type="button" onClick={onMenu} className="-ml-1 grid size-10 place-items-center rounded-lg text-fg-2 hover:bg-white/[0.06] lg:hidden" aria-label="Abrir menu">
        <Menu className="size-5" />
      </button>
      <p className="truncate text-sm font-semibold text-fg">
        <span className="hidden text-muted sm:inline">Painel / </span>
        {current?.label}
      </p>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {settings.showDemoNotice && (
          <span className="hidden rounded-md bg-warn/10 px-2 py-1 text-[0.65rem] font-semibold text-warn md:inline">Dados simulados</span>
        )}
        <AdminUserMenu />
        <AdminButton variant="ghost" size="sm" onClick={logout} loading={loggingOut} className="hidden md:inline-flex" aria-label="Sair do painel">
          {!loggingOut && <LogOut className="size-4" />} Sair
        </AdminButton>
      </div>
    </header>
  );
}

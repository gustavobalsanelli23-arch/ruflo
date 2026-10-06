'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { AdminSidebar, ADMIN_NAV, isAdminActive } from './AdminSidebar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings } = useStoreData();
  const [open, setOpen] = useState(false);
  const current = ADMIN_NAV.find((n) => isAdminActive(n.href, pathname));

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh bg-[#0b0c0f] lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block">
        <AdminSidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Menu administrativo" className="animate-fade-up absolute inset-y-0 left-0 w-72 border-r border-line bg-surface">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-fg-2 hover:bg-surface-3" aria-label="Fechar menu">
              <X className="size-5" />
            </button>
            <AdminSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-[#0b0c0f]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full text-fg-2 hover:bg-surface-3 lg:hidden" aria-label="Abrir menu">
            <Menu className="size-5" />
          </button>
          <p className="text-sm font-semibold text-fg-2">
            <span className="text-muted">Admin /</span> {current?.label}
          </p>
          <div className="ml-auto flex items-center gap-3">
            {settings.showDemoNotice && (
              <span className="hidden rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-brand-300 sm:inline">
                Dados simulados
              </span>
            )}
            <span className="grid size-9 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white" title="Administrador (demonstração)">AD</span>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

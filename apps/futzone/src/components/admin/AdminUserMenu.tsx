'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/format';
import { useAdmin } from './AdminGuard';
import { AdminAvatar } from './AdminUI';

/** Administrador conectado + atalhos e botão Sair. */
export function AdminUserMenu() {
  const { session, logout, loggingOut } = useAdmin();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { admin } = session;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-xl p-1 pr-2 transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <AdminAvatar initials={admin.initials} />
        <span className="hidden text-left sm:block">
          <span className="block max-w-40 truncate text-sm font-semibold leading-tight text-fg">{admin.name}</span>
          <span className="flex items-center gap-1 text-[0.7rem] text-muted">
            <ShieldCheck className="size-3 text-brand-400" /> Administrador
          </span>
        </span>
        <ChevronDown className={cn('size-4 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="animate-pop absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/[0.08] bg-surface-2 shadow-2xl">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="truncate text-sm font-semibold text-fg">{admin.name}</p>
            <p className="truncate text-xs text-muted">{admin.email}</p>
            <p className="mt-2 text-[0.7rem] text-subtle">Sessão iniciada em {formatDateTime(session.issuedAt)}</p>
          </div>
          <Link href="/admin/configuracoes" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg-2 hover:bg-white/[0.05] hover:text-fg">
            <Settings className="size-4" /> Configurações
          </Link>
          <button type="button" role="menuitem" onClick={logout} disabled={loggingOut} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/10 disabled:opacity-60">
            <LogOut className="size-4" /> {loggingOut ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      )}
    </div>
  );
}

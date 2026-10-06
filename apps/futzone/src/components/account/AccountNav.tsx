'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, MapPin, Package, UserRound } from 'lucide-react';
import { accountNav } from '@/data/site';
import { useStoreData } from '@/context/StoreDataContext';
import { cn } from '@/lib/format';

const ICONS = [LayoutGrid, Package, UserRound, MapPin];

export function AccountNav() {
  const pathname = usePathname();
  const { customer } = useStoreData();
  const initials = customer.name.split(' ').map((n) => n[0]).slice(0, 2).join('');

  return (
    <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
        <span className="grid size-12 place-items-center rounded-full bg-brand-500 text-lg font-bold text-white">{initials}</span>
        <div className="min-w-0">
          <p className="truncate font-bold">{customer.name}</p>
          <p className="truncate text-xs text-muted">{customer.email}</p>
        </div>
      </div>
      <nav aria-label="Minha conta">
        <ul className="flex gap-2 overflow-x-auto scrollbar-none lg:flex-col lg:gap-1">
          {accountNav.map((link, i) => {
            const Icon = ICONS[i];
            const active = pathname === link.href;
            return (
              <li key={link.href} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'bg-brand-500/15 text-brand-200 ring-1 ring-brand-500/40' : 'text-fg-2 hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  <Icon className={cn('size-4', active ? 'text-brand-400' : 'text-muted')} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

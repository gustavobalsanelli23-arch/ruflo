'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { accountNav } from '@/data/site';
import { useCustomerAuth, useCurrentCustomer } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { useCustomerNotifications } from '@/hooks/useAccountData';
import { cn } from '@/lib/format';

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0]!.toUpperCase())
    .slice(0, 2)
    .join('');

const isActive = (href: string, pathname: string) => (href === '/conta' ? pathname === '/conta' : pathname === href || pathname.startsWith(`${href}/`));

/** Placa de aço da navegação (o contorno de foco fica por dentro: a faixa do celular rola e cortaria o de fora). */
const PLATE =
  'relative flex h-11 items-center gap-3 whitespace-nowrap rounded-[var(--radius-card)] border px-4 text-[0.75rem] font-bold uppercase tracking-[0.12em] transition-[background-color,border-color,color] duration-150 focus-visible:outline-offset-[-2px] lg:h-12';

/**
 * Navegação da conta: uma coluna de placas de aço no desktop e uma faixa de
 * placas com rolagem lateral no celular. A placa da página atual acende a
 * faixa azul no topo (o único azul da navegação).
 */
export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const customer = useCurrentCustomer();
  const { logout } = useCustomerAuth();
  const { notify } = useToast();
  const { unread } = useCustomerNotifications();
  const listRef = useRef<HTMLUListElement>(null);
  const firstScroll = useRef(true);

  // Celular: a placa ativa vai para o meio da faixa (só rolagem lateral, a página não pula).
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    const left = item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2;
    const instant = firstScroll.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ left: Math.max(0, left), behavior: instant ? 'auto' : 'smooth' });
    firstScroll.current = false;
  }, [pathname]);

  const signOut = async () => {
    await logout();
    notify('Você saiu da sua conta.', 'info');
    router.replace('/');
  };

  return (
    <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
      <div className="mb-3 hidden items-center gap-3 rounded-[var(--radius-card)] border border-line bg-steel px-4 py-3.5 lg:flex">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-button)] border border-line-strong bg-steel-3 text-sm font-bold text-fg">
          {initialsOf(customer.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-snug text-fg">{customer.name}</p>
          <p className="truncate text-xs leading-snug text-muted">{customer.email}</p>
        </div>
      </div>

      <nav aria-label="Minha conta">
        <ul
          ref={listRef}
          className="relative -mx-4 flex snap-x gap-1.5 overflow-x-auto scroll-px-4 px-4 scrollbar-none sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
        >
          {accountNav.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <li key={link.href} className="shrink-0 snap-start">
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(PLATE, active ? 'border-line-strong bg-steel-3 text-fg' : 'border-line bg-steel text-fg-2 hover:border-line-strong hover:bg-steel-2 hover:text-fg')}
                >
                  {active && <span aria-hidden className="animate-fade absolute inset-x-3 -top-px h-[2px] bg-brand-500" />}
                  {link.label}
                  {link.href === '/conta/notificacoes' && unread > 0 && (
                    <span
                      role="img"
                      aria-label={`${unread} não lidas`}
                      className="ml-auto rounded-[var(--radius-chip)] border border-line-strong px-1.5 py-px text-[0.6875rem] tabular-nums tracking-normal text-fg"
                    >
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li className="shrink-0 snap-start lg:mt-3">
            <button type="button" onClick={signOut} className={cn(PLATE, 'w-full border-line text-muted hover:border-line-strong hover:bg-steel-2 hover:text-fg')}>
              Sair
              <LogOut className="size-4 lg:ml-auto" strokeWidth={1.75} aria-hidden />
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, ShoppingBag, UserRound, X, LayoutDashboard } from 'lucide-react';
import { mainNav, type NavLink } from '@/data/site';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/format';
import { Logo } from '@/components/brand/Logo';
import { SearchBar } from './SearchBar';

export function isNavActive(link: NavLink, pathname: string): boolean {
  if (link.href === '/') return pathname === '/';
  return (link.match ?? [link.href]).some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

export function Header() {
  const pathname = usePathname();
  const { count, open: openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  const iconBtn = 'relative grid size-10 place-items-center rounded-full text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-all duration-300',
        scrolled ? 'border-line bg-bg/85 backdrop-blur-xl' : 'border-transparent bg-bg',
      )}
    >
      <div className="bg-gradient-to-r from-brand-800 via-brand-600 to-brand-800 py-1.5 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/90">
        Loja em demonstração<span className="hidden sm:inline"> · pagamentos e entregas ainda não disponíveis</span>
      </div>

      <div className="container-fz flex h-16 items-center gap-3 lg:h-20 lg:gap-8">
        <button type="button" className={cn(iconBtn, 'lg:hidden')} onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
          <Menu className="size-5" />
        </button>

        <Logo className="shrink-0" />

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((link) => {
              const active = isNavActive(link, pathname);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative rounded-full px-3.5 py-2 text-[0.8rem] font-bold uppercase tracking-wider transition-colors',
                      active ? 'text-brand-300' : 'text-fg-2 hover:text-fg',
                    )}
                  >
                    {link.label}
                    <span
                      className={cn(
                        'absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand-500 transition-transform duration-300',
                        active ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <SearchBar className="ml-auto hidden w-full max-w-sm md:block" />

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button type="button" className={cn(iconBtn, 'md:hidden')} onClick={() => setSearchOpen((v) => !v)} aria-label="Buscar" aria-expanded={searchOpen}>
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <Link href="/conta" className={cn(iconBtn, pathname.startsWith('/conta') && 'text-brand-300')} aria-label="Minha conta">
            <UserRound className="size-5" />
          </Link>
          <button type="button" className={iconBtn} onClick={openCart} aria-label={`Abrir carrinho (${count} itens)`}>
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="animate-fade absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[0.65rem] font-bold leading-5 text-white ring-2 ring-bg">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="container-fz animate-fade pb-3 md:hidden">
          <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="animate-fade-up absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col border-r border-line bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo />
              <button type="button" className={iconBtn} onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
                <X className="size-5" />
              </button>
            </div>
            <nav aria-label="Menu mobile" className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {mainNav.map((link) => {
                  const active = isNavActive(link, pathname);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'heading-display flex items-center justify-between rounded-xl px-4 py-3.5 text-2xl transition-colors',
                          active ? 'bg-brand-500/12 text-brand-300' : 'text-fg hover:bg-surface-2',
                        )}
                      >
                        {link.label}
                        {active && <span className="size-2 rounded-full bg-brand-500" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="space-y-1 border-t border-line p-3 text-sm">
              <Link href="/conta" className="flex items-center gap-3 rounded-xl px-4 py-3 text-fg-2 hover:bg-surface-2">
                <UserRound className="size-4 text-brand-400" /> Minha conta
              </Link>
              <Link href="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-fg-2 hover:bg-surface-2">
                <LayoutDashboard className="size-4 text-brand-400" /> Painel administrativo
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

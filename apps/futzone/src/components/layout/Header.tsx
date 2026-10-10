'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { mainNav, type NavLink } from '@/data/site';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/format';
import { Logo } from '@/components/brand/Logo';
import { SearchBar } from '@/components/navigation/SearchBar';
import { MobileMenu } from '@/components/navigation/MobileMenu';
import { AccountButton } from '@/components/navigation/AccountButton';

export function isNavActive(link: NavLink, pathname: string): boolean {
  if (link.href === '/') return pathname === '/';
  return (link.match ?? [link.href]).some((m) => pathname === m || pathname.startsWith(`${m}/`));
}

/** Contador do carrinho que "pula" quando a quantidade aumenta. */
function useBumpOnIncrease(value: number) {
  const prev = useRef(value);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (value > prev.current) setBump((b) => b + 1);
    prev.current = value;
  }, [value]);
  return bump;
}

/**
 * Saiu do topo da página? Observa o marcador `[data-header-sentinel]` do layout
 * com IntersectionObserver: nada roda a cada quadro de rolagem.
 */
function useScrolledPastTop() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const sentinel = document.querySelector('[data-header-sentinel]');
    if (!sentinel || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 0 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);
  return scrolled;
}

export function Header() {
  const pathname = usePathname();
  const { count, open: openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrolled = useScrolledPastTop();
  const bump = useBumpOnIncrease(count);
  const atHomeTop = pathname === '/' && !scrolled;

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const iconBtn =
    'relative grid size-10 place-items-center rounded-xl text-fg-2 transition-[background-color,color,transform] duration-150 hover:bg-white/[0.06] hover:text-fg active:scale-95';

  return (
    <header className="sticky top-0 z-40">
      {/* Aviso honesto de demonstração: recolhe ao rolar */}
      <div
        className={cn(
          'grid overflow-hidden border-b border-line bg-steel text-center transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-fz)]',
          scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
      >
        <p className="min-h-0 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Loja em demonstração<span className="hidden sm:inline">: pagamentos e entregas ainda não disponíveis</span>
        </p>
      </div>

      <div
        className={cn(
          'border-b transition-[background-color,border-color,box-shadow] duration-300 ease-[var(--ease-out-fz)]',
          atHomeTop ? 'border-transparent bg-transparent' : 'border-line bg-bg/95 shadow-[0_12px_30px_-24px_rgb(0_0_0/0.9)] backdrop-blur-md',
        )}
      >
        <div className={cn('container-fz flex items-center gap-2 transition-[height] duration-300 ease-[var(--ease-out-fz)] lg:gap-7', scrolled ? 'h-14' : 'h-16 lg:h-[68px]')}>
          <button type="button" className={cn(iconBtn, '-ml-2 lg:hidden')} onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen}>
            <Menu className="size-5" strokeWidth={1.75} />
          </button>

          <Logo imgClassName={cn('w-auto transition-[height] duration-300', scrolled ? 'h-6 sm:h-6' : 'h-7 sm:h-[30px]')} />

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center">
              {mainNav.map((link) => {
                const active = isNavActive(link, pathname);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative block px-3.5 py-2 text-[0.78rem] font-bold uppercase tracking-[0.14em] transition-colors duration-150',
                        active ? 'text-fg' : 'text-fg-2 hover:text-fg',
                      )}
                    >
                      {link.label}
                      {/* Luz do item ativo: o único azul do cabeçalho */}
                      <span
                        aria-hidden
                        className={cn(
                          'absolute inset-x-3.5 -bottom-[3px] h-[2px] origin-left transition-[transform,background-color] duration-200 ease-[var(--ease-out-fz)]',
                          active ? 'scale-x-100 bg-brand-500' : 'scale-x-0 bg-fg-2/50 group-hover:scale-x-100',
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <SearchBar className="ml-auto hidden w-60 transition-[width] duration-300 ease-[var(--ease-out-fz)] focus-within:w-[22rem] md:block xl:w-72" />

          <div className="ml-auto flex items-center gap-0.5 md:ml-0">
            <button type="button" className={cn(iconBtn, 'md:hidden')} onClick={() => setSearchOpen((v) => !v)} aria-label="Buscar" aria-expanded={searchOpen}>
              {searchOpen ? <X className="size-5" strokeWidth={1.75} /> : <Search className="size-5" strokeWidth={1.75} />}
            </button>
            <AccountButton className={cn(iconBtn, 'hidden sm:grid', pathname.startsWith('/conta') && 'text-fg')} />
            <button type="button" className={iconBtn} onClick={openCart} aria-label={`Abrir carrinho (${count} ${count === 1 ? 'item' : 'itens'})`}>
              <ShoppingBag key={bump} className={cn('size-5', bump > 0 && 'animate-bump')} strokeWidth={1.75} />
              {count > 0 && (
                <span key={`n${bump}`} className="animate-pop absolute right-0 top-0.5 grid min-w-[1.15rem] place-items-center rounded-[4px] bg-brand-600 px-1 text-[0.62rem] font-bold leading-[1.15rem] text-white ring-2 ring-bg">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="container-fz animate-fade pb-4 md:hidden">
            <SearchBar autoFocus inlinePanel onNavigate={() => setSearchOpen(false)} />
          </div>
        )}
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />
    </header>
  );
}

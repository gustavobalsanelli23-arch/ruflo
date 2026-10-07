'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { mainNav, type NavLink } from '@/data/site';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/format';
import { Logo } from '@/components/brand/Logo';
import { SearchBar } from '@/components/navigation/SearchBar';
import { MobileMenu } from '@/components/navigation/MobileMenu';

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

export function Header() {
  const pathname = usePathname();
  const { count, open: openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bump = useBumpOnIncrease(count);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const iconBtn =
    'relative grid size-10 place-items-center rounded-full text-fg-2 transition-[background-color,color,transform] duration-200 hover:bg-white/[0.07] hover:text-fg active:scale-95';

  return (
    <header className="sticky top-0 z-40">
      {/* Faixa informativa — recolhe ao rolar */}
      <div
        className={cn(
          'grid overflow-hidden border-b border-white/5 bg-surface text-center transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-fz)]',
          scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
      >
        <p className="min-h-0 py-2 text-[0.68rem] font-medium tracking-[0.14em] text-muted uppercase">
          <span className="mr-2 inline-block size-1.5 -translate-y-px rounded-full bg-brand-500 align-middle" aria-hidden />
          Loja em demonstração<span className="hidden sm:inline"> · pagamentos e entregas ainda não disponíveis</span>
        </p>
      </div>

      <div
        className={cn(
          'glass border-b transition-[border-color,background-color] duration-300',
          scrolled ? 'border-white/[0.07] bg-bg/85' : 'border-transparent',
        )}
      >
        <div className={cn('container-fz flex items-center gap-2 transition-[height] duration-300 ease-[var(--ease-out-fz)] lg:gap-8', scrolled ? 'h-14' : 'h-16 lg:h-[72px]')}>
          <button type="button" className={cn(iconBtn, '-ml-2 lg:hidden')} onClick={() => setMenuOpen(true)} aria-label="Abrir menu" aria-expanded={menuOpen}>
            <Menu className="size-5" />
          </button>

          <Logo imgClassName={cn('w-auto transition-[height] duration-300', scrolled ? 'h-6 sm:h-6' : 'h-7 sm:h-8')} />

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
                        'group relative block px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.12em] transition-colors duration-200',
                        active ? 'text-fg' : 'text-fg-2 hover:text-fg',
                      )}
                    >
                      {link.label}
                      <span
                        className={cn(
                          'absolute inset-x-3 -bottom-px h-0.5 origin-left rounded-full bg-brand-500 transition-transform duration-300 ease-[var(--ease-out-fz)]',
                          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 group-hover:bg-white/40',
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
              {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
            </button>
            <Link href="/conta" className={cn(iconBtn, 'hidden sm:grid', pathname.startsWith('/conta') && 'text-fg')} aria-label="Minha conta">
              <UserRound className="size-5" />
            </Link>
            <button type="button" className={iconBtn} onClick={openCart} aria-label={`Abrir carrinho (${count} ${count === 1 ? 'item' : 'itens'})`}>
              <ShoppingBag key={bump} className={cn('size-5', bump > 0 && 'animate-bump')} />
              {count > 0 && (
                <span key={`n${bump}`} className="animate-pop absolute right-0.5 top-0.5 grid min-w-[1.15rem] place-items-center rounded-full bg-brand-500 px-1 text-[0.62rem] font-bold leading-[1.15rem] text-white ring-2 ring-bg">
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

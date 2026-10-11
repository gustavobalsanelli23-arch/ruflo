'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, ShoppingBag, UserRound, X } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { mainNav } from '@/data/site';
import { collections, collectionHref } from '@/data/collections';
import { cn } from '@/lib/format';
import { Logo } from '@/components/brand/Logo';
import { SearchBar } from './SearchBar';

interface MobileMenuProps {
  open: boolean;
  onClose(): void;
  pathname: string;
}

/** Fecha mais rápido do que abre: a resposta ao toque é imediata. */
const EXIT_MS = 180;

/** Menu lateral do celular: busca, navegação, coleções e conta. */
export function MobileMenu({ open, onClose, pathname }: MobileMenuProps) {
  const { customer } = useCustomerAuth();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className={cn('absolute inset-0 bg-black/70 transition-opacity duration-200', closing ? 'opacity-0' : 'animate-fade')}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          'absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col border-r border-line-strong bg-steel',
          closing ? '-translate-x-full transition-transform duration-[180ms] ease-[var(--ease-out-fz)]' : 'animate-drawer-left',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <Logo href="/" />
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl text-fg-2 transition-[background-color,color] hover:bg-white/[0.06] hover:text-fg" aria-label="Fechar menu">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <SearchBar inlinePanel onNavigate={onClose} className="mt-4" />

          <nav aria-label="Menu mobile" className="mt-5">
            <ul>
              {[{ label: 'Início', href: '/' }, ...mainNav].map((link, i) => {
                const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                return (
                  <li key={link.href} className="animate-fade-up" style={{ animationDelay: `${50 + i * 35}ms` }}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'heading-stencil relative flex items-center justify-between border-b border-line py-4 text-[1.85rem] transition-colors',
                        active ? 'text-fg' : 'text-fg-2 hover:text-fg',
                      )}
                    >
                      {active && <span className="absolute left-0 top-0 h-[2px] w-10 bg-brand-500" aria-hidden />}
                      {link.label}
                      <ArrowRight className="size-5 text-subtle" strokeWidth={1.75} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <h2 className="mb-3 mt-8 text-sm font-bold text-fg">Coleções</h2>
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <Link key={c.id} href={collectionHref(c.id)} onClick={onClose} className="rounded-[var(--radius-chip)] border border-line-strong px-3.5 py-2 text-sm text-fg-2 transition-colors hover:border-fg-2/60 hover:text-fg">
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-line text-xs">
          {[
            customer ? { href: '/conta', label: 'Minha conta', icon: UserRound } : { href: '/login', label: 'Entrar', icon: UserRound },
            { href: customer ? '/conta/favoritos' : '/login?next=%2Fconta%2Ffavoritos', label: 'Favoritos', icon: Heart },
            { href: '/carrinho', label: 'Carrinho', icon: ShoppingBag },
          ].map(({ href, label, icon: Icon }, i) => (
            <Link key={label} href={href} onClick={onClose} className={cn('flex flex-col items-center gap-1.5 py-3.5 text-fg-2 transition-colors hover:bg-white/[0.04] hover:text-fg', i > 0 && 'border-l border-line')}>
              <Icon className="size-5" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

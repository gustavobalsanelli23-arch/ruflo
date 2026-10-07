'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, UserRound, X } from 'lucide-react';
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

/** Menu lateral do celular: busca, navegação, coleções e conta. */
export function MobileMenu({ open, onClose, pathname }: MobileMenuProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Menu" className="animate-drawer-left absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-surface shadow-2xl">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo href="/" />
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full text-fg-2 transition-colors hover:bg-white/[0.07] hover:text-fg" aria-label="Fechar menu">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <SearchBar inlinePanel onNavigate={onClose} className="mt-1" />

          <nav aria-label="Menu mobile" className="mt-6">
            <ul>
              {[{ label: 'Início', href: '/' }, ...mainNav].map((link, i) => {
                const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                return (
                  <li key={link.href} className="animate-fade-up" style={{ animationDelay: `${60 + i * 35}ms` }}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'heading-display flex items-center justify-between border-b border-white/[0.06] py-4 text-[1.75rem] transition-colors',
                        active ? 'text-fg' : 'text-fg-2 hover:text-fg',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        {active && <span className="h-5 w-1 rounded-full bg-brand-500" aria-hidden />}
                        {link.label}
                      </span>
                      <ArrowRight className="size-5 text-subtle" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="mb-3 mt-8 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted">Coleções</p>
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <Link key={c.id} href={collectionHref(c.id)} onClick={onClose} className="rounded-full border border-line px-3.5 py-2 text-sm text-fg-2 transition-colors hover:border-brand-500 hover:text-fg">
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 border-t border-white/[0.06] p-3 text-xs">
          {[
            { href: '/conta', label: 'Conta', icon: UserRound },
            { href: '/carrinho', label: 'Carrinho', icon: ShoppingBag },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={onClose} className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 text-fg-2 transition-colors hover:bg-white/[0.05] hover:text-fg">
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

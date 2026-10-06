'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { usePublicProducts } from '@/context/StoreDataContext';
import { matchesSearch, sortProducts } from '@/lib/catalog';
import { cn, formatPrice } from '@/lib/format';
import { productHref, teamById } from '@/lib/product';
import { ProductImage } from './ProductImage';

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
  onNavigate?(): void;
}

/** Busca com sugestões instantâneas sobre os dados locais. */
export function SearchBar({ className, autoFocus, onNavigate }: SearchBarProps) {
  const router = useRouter();
  const products = usePublicProducts();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);

  const suggestions = useMemo(
    () => (q.trim().length < 2 ? [] : sortProducts(products.filter((p) => matchesSearch(p, q)), 'relevancia').slice(0, 5)),
    [products, q],
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    onNavigate?.();
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) return go(productHref(suggestions[active]));
    go(q.trim() ? `/camisas?q=${encodeURIComponent(q.trim())}` : '/camisas');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && q.trim().length >= 2;

  return (
    <form ref={rootRef} role="search" onSubmit={submit} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar time, seleção ou camisa…"
        aria-label="Buscar produtos"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        className="h-11 w-full rounded-full border border-line bg-surface-2/80 pl-10 pr-10 text-sm text-fg placeholder:text-subtle transition-colors focus:border-brand-500 focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-brand-500/25 [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-fg" aria-label="Limpar busca">
          <X className="size-4" />
        </button>
      )}

      {showList && (
        <div id={listId} role="listbox" className="animate-fade absolute inset-x-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
          {suggestions.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted">Nenhuma camisa encontrada para “{q}”.</p>
          ) : (
            <ul>
              {suggestions.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === active}>
                  <Link
                    href={productHref(p)}
                    onClick={(e) => {
                      e.preventDefault();
                      go(productHref(p));
                    }}
                    className={cn('flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2', i === active && 'bg-surface-2')}
                  >
                    <ProductImage product={p} className="size-12 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted">{teamById(p.teamId)?.name}</span>
                    </span>
                    <span className="text-sm font-bold text-brand-300">{formatPrice(p.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <button type="submit" className="block w-full border-t border-line px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-brand-400 hover:bg-surface-2">
            Ver todos os resultados
          </button>
        </div>
      )}
    </form>
  );
}

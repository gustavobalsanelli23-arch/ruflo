'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Clock, Search, SearchX, TrendingUp, X } from 'lucide-react';
import { teams } from '@/data/teams';
import { collections, collectionHref } from '@/data/collections';
import { usePublicProducts } from '@/context/StoreDataContext';
import { matchesSearch, normalize, sortProducts } from '@/lib/catalog';
import { cn, formatPrice } from '@/lib/format';
import { productHref, teamById } from '@/lib/product';
import { readJSON, STORAGE_KEYS, writeJSON } from '@/services/storage';
import { ProductImage } from '@/components/products/ProductImage';

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
  /** Painel de sugestões abaixo do campo (padrão) ou fluindo no documento (mobile). */
  inlinePanel?: boolean;
  onNavigate?(): void;
  /** Nome acessível do campo (padrão "Buscar produtos"). */
  label?: string;
  /** "lg" acompanha a altura dos botões grandes (busca do hero). */
  size?: 'md' | 'lg';
}

const MAX_RECENT = 5;
const POPULAR_TEAMS = ['flamengo', 'palmeiras', 'corinthians', 'brasil', 'real-madrid', 'barcelona'];

/**
 * Busca com sugestões sobre os dados locais: camisas, times, jogadores
 * (pelo nome do produto) e coleções. Sem texto, mostra populares e recentes.
 */
export function SearchBar({ className, autoFocus, inlinePanel, onNavigate, label = 'Buscar produtos', size = 'md' }: SearchBarProps) {
  const router = useRouter();
  const products = usePublicProducts();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const term = q.trim();

  useEffect(() => setRecent(readJSON<string[]>(STORAGE_KEYS.recentSearches, [])), []);

  const popular = useMemo(() => sortProducts(products, 'relevancia').slice(0, 4), [products]);
  const results = useMemo(
    () => (term.length < 2 ? [] : sortProducts(products.filter((p) => matchesSearch(p, term)), 'relevancia').slice(0, 6)),
    [products, term],
  );
  const teamHits = useMemo(() => {
    if (term.length < 2) return [];
    const n = normalize(term);
    return teams.filter((t) => normalize(t.name).includes(n)).slice(0, 3);
  }, [term]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const remember = (value: string) => {
    const next = [value, ...recent.filter((r) => r !== value)].slice(0, MAX_RECENT);
    setRecent(next);
    writeJSON(STORAGE_KEYS.recentSearches, next);
  };

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    onNavigate?.();
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && results[active]) return go(productHref(results[active]));
    if (term) remember(term);
    go(term ? `/camisas?q=${encodeURIComponent(term)}` : '/camisas');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  const searchFor = (value: string) => {
    remember(value);
    go(`/camisas?q=${encodeURIComponent(value)}`);
  };

  const sectionTitle = 'mb-2 flex items-center gap-2 px-1 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-muted';
  const chip = 'rounded-[var(--radius-chip)] border border-line-strong px-3 py-1.5 text-xs text-fg-2 transition-colors duration-150 hover:border-fg-2/60 hover:text-fg';

  const productRow = (p: (typeof products)[number], i?: number) => (
    <li key={p.id} role="option" aria-selected={i === active}>
      <Link
        href={productHref(p)}
        onClick={(e) => {
          e.preventDefault();
          if (term) remember(term);
          go(productHref(p));
        }}
        className={cn('flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-white/[0.05]', i === active && 'bg-white/[0.06]')}
      >
        <ProductImage product={p} className="h-14 w-11 shrink-0 rounded-lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{p.name}</span>
          <span className="block text-xs text-muted">{teamById(p.teamId)?.name}</span>
        </span>
        <span className="text-sm font-bold text-fg">{formatPrice(p.price)}</span>
      </Link>
    </li>
  );

  return (
    <form ref={rootRef} role="search" onSubmit={submit} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
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
        placeholder="Buscar time, jogador ou camisa"
        aria-label={label}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={cn(
          'w-full border border-line-strong bg-steel-2 pl-11 pr-10 text-fg placeholder:text-muted transition-[background-color,border-color,box-shadow] duration-200 hover:border-fg-2/40 focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/25 [&::-webkit-search-cancel-button]:hidden',
          size === 'lg' ? 'h-13 rounded-[var(--radius-button,0.75rem)] text-[0.95rem]' : 'h-11 rounded-xl text-sm',
        )}
      />
      {q && (
        <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:text-fg" aria-label="Limpar busca">
          <X className="size-4" />
        </button>
      )}

      {open && (
        <div
          id={listId}
          role="listbox"
          className={cn(
            'animate-pop z-50 overflow-hidden rounded-2xl border border-line-strong bg-steel p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]',
            inlinePanel ? 'mt-3' : 'absolute inset-x-0 top-[calc(100%+10px)] min-w-[22rem] origin-top',
          )}
        >
          {term.length < 2 ? (
            <div className="space-y-4">
              {recent.length > 0 && (
                <section>
                  <p className={sectionTitle}>
                    <Clock className="size-3.5" /> Buscas recentes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} type="button" onClick={() => searchFor(r)} className={chip}>
                        {r}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section>
                <p className={sectionTitle}>Coleções</p>
                <div className="flex flex-wrap gap-2">
                  {collections.map((c) => (
                    <button key={c.id} type="button" onClick={() => go(collectionHref(c.id))} className={chip}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <p className={sectionTitle}>
                  <TrendingUp className="size-3.5" /> Populares
                </p>
                <ul>{popular.map((p) => productRow(p))}</ul>
              </section>
            </div>
          ) : results.length === 0 && teamHits.length === 0 ? (
            <div className="px-2 py-5 text-center">
              <SearchX className="mx-auto mb-3 size-6 text-subtle" />
              <p className="text-sm font-semibold text-fg">Nada encontrado para “{term}”</p>
              <p className="mt-1 text-xs text-muted">Confira a grafia ou tente um destes times:</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {POPULAR_TEAMS.map((id) => teamById(id)).map(
                  (t) =>
                    t && (
                      <button key={t.id} type="button" onClick={() => go(`/camisas/${t.slug}`)} className={chip}>
                        {t.name}
                      </button>
                    ),
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {teamHits.length > 0 && (
                <section>
                  <p className={sectionTitle}>Times</p>
                  <div className="flex flex-wrap gap-2">
                    {teamHits.map((t) => (
                      <button key={t.id} type="button" onClick={() => go(`/camisas/${t.slug}`)} className={cn(chip, 'inline-flex items-center gap-1')}>
                        {t.name} <ArrowUpRight className="size-3" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {results.length > 0 && (
                <section>
                  <p className={sectionTitle}>Camisas</p>
                  <ul>{results.map((p, i) => productRow(p, i))}</ul>
                </section>
              )}
              <button type="submit" className="flex w-full items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-fg transition-colors hover:bg-white/[0.08]">
                Ver todos os resultados para “{term}” <ArrowUpRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import type { CategoryId } from '@/types/catalog';
import { categories } from '@/data/categories';
import { collectionById } from '@/data/collections';
import { usePublicProducts, useStoreData } from '@/context/StoreDataContext';
import {
  activeFilterCount,
  EMPTY_QUERY,
  paramsFromQuery,
  PRICE_RANGES,
  queryCatalog,
  queryFromParams,
  SORT_OPTIONS,
  type CatalogQuery,
  type SortKey,
} from '@/lib/catalog';
import { teamById } from '@/lib/product';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { ProductGrid } from '@/components/products/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';
import { ProductFilters } from './ProductFilters';

export interface CatalogPreset {
  category?: CategoryId;
  teamId?: string;
  onSale?: boolean;
}

const PAGE_SIZE = 12;

/**
 * Catálogo completo: busca, filtros, ordenação e carregamento progressivo.
 * O estado vive na URL (?q=&time=&categoria=…) para que links e o botão
 * "voltar" do navegador funcionem.
 */
export function CatalogView({ preset = {} }: { preset?: CatalogPreset }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const allProducts = usePublicProducts();
  const { hydrated } = useStoreData();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const query = useMemo(() => queryFromParams(new URLSearchParams(params.toString())), [params]);

  const scoped = useMemo(
    () =>
      allProducts.filter(
        (p) =>
          (!preset.category || p.category === preset.category) &&
          (!preset.teamId || p.teamId === preset.teamId) &&
          (!preset.onSale || (p.compareAtPrice ?? 0) > p.price),
      ),
    [allProducts, preset.category, preset.teamId, preset.onSale],
  );

  const results = useMemo(() => queryCatalog(scoped, query), [scoped, query]);

  useEffect(() => setVisible(PAGE_SIZE), [query]);

  // Busca por nome com pequeno atraso para não reescrever a URL a cada tecla.
  const [term, setTerm] = useState(query.q);
  useEffect(() => setTerm(query.q), [query.q]);
  useEffect(() => {
    if (term === query.q) return;
    const t = window.setTimeout(() => update({ ...query, q: term.trim() }), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const update = (next: CatalogQuery) => {
    const qs = paramsFromQuery(next).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const locked = { category: !!preset.category, team: !!preset.teamId, onSale: !!preset.onSale };
  const filterCount = activeFilterCount(query);

  const chips: Array<{ key: string; label: string; remove(): void }> = [
    ...query.collections.map((c) => ({
      key: `col-${c}`,
      label: collectionById(c)?.name ?? c,
      remove: () => update({ ...query, collections: query.collections.filter((x) => x !== c) }),
    })),
    ...query.categories.map((c) => ({
      key: `c-${c}`,
      label: categories.find((x) => x.id === c)?.shortName ?? c,
      remove: () => update({ ...query, categories: query.categories.filter((x) => x !== c) }),
    })),
    ...query.teams.map((t) => ({ key: `t-${t}`, label: teamById(t)?.name ?? t, remove: () => update({ ...query, teams: query.teams.filter((x) => x !== t) }) })),
    ...query.sizes.map((s) => ({ key: `s-${s}`, label: `Tam. ${s}`, remove: () => update({ ...query, sizes: query.sizes.filter((x) => x !== s) }) })),
    ...(query.price ? [{ key: 'price', label: PRICE_RANGES.find((r) => r.id === query.price)?.label ?? '', remove: () => update({ ...query, price: null }) }] : []),
    ...(query.onSale ? [{ key: 'sale', label: 'Promoções', remove: () => update({ ...query, onSale: false }) }] : []),
  ];

  const clearAll = () => update({ ...EMPTY_QUERY, sort: query.sort });

  const filters = <ProductFilters query={query} onChange={update} products={scoped} locked={locked} />;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] xl:gap-12">
      <aside className="hidden lg:block">
        <div className="sticky top-32 max-h-[calc(100dvh-9rem)] overflow-y-auto pr-2 scrollbar-none">{filters}</div>
      </aside>

      <div className="min-w-0">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar pelo nome da camisa, time ou temporada"
            aria-label="Buscar no catálogo"
            className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-11 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {term && (
            <button type="button" onClick={() => setTerm('')} className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-white/[0.08] hover:text-fg" aria-label="Limpar busca">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="glass sticky top-[3.5rem] z-20 -mx-4 mb-5 flex flex-wrap items-center gap-3 px-4 py-2.5 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
            <SlidersHorizontal className="size-4" /> Filtros
            {filterCount > 0 && <span key={filterCount} className="animate-pop grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[0.65rem] leading-5 text-white">{filterCount}</span>}
          </Button>
          <p className="text-sm text-muted" aria-live="polite">
            <span className="font-bold tabular-nums text-fg">{hydrated ? results.length : '—'}</span> {results.length === 1 ? 'produto' : 'produtos'}
            {query.q && (
              <>
                {' '}para <span className="text-brand-300">“{query.q}”</span>
              </>
            )}
          </p>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">Ordenar por</span>
            <Select
              value={query.sort}
              onChange={(e) => update({ ...query, sort: e.target.value as SortKey })}
              className="h-9 w-40 rounded-lg text-xs"
              aria-label="Ordenar produtos"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {(chips.length > 0 || query.q) && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {query.q && (
              <button type="button" onClick={() => update({ ...query, q: '' })} className="animate-pop inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-100 transition-colors hover:border-brand-400 hover:bg-brand-500/20">
                Busca: {query.q} <X className="size-3" />
              </button>
            )}
            {chips.map((c) => (
              <button key={c.key} type="button" onClick={c.remove} className="animate-pop inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-100 transition-colors hover:border-brand-400 hover:bg-brand-500/20">
                {c.label} <X className="size-3" />
              </button>
            ))}
            {chips.length > 0 && (
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-muted underline-offset-4 hover:text-fg hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {!hydrated ? (
          <ProductGridSkeleton count={8} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="Nenhuma camisa encontrada"
            description={query.q ? `Não encontramos resultados para “${query.q}”. Tente o nome de um time, jogador ou temporada.` : 'Nenhum produto combina com esses filtros. Tente remover alguns deles.'}
            action={
              <>
                <Button onClick={() => update({ ...EMPTY_QUERY })}>Limpar busca e filtros</Button>
                <Button variant="outline" onClick={() => router.push('/times')}>Ver times</Button>
              </>
            }
          />
        ) : (
          <>
            <ProductGrid products={results.slice(0, visible)} priorityCount={4} />
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-xs text-muted">
                Mostrando {Math.min(visible, results.length)} de {results.length}
              </p>
              <div className="h-1 w-48 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(Math.min(visible, results.length) / results.length) * 100}%` }} />
              </div>
              {visible < results.length && (
                <Button variant="outline" className="mt-2" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Carregar mais
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Filtros" className="animate-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[1.75rem] bg-surface shadow-2xl">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/15" aria-hidden />
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <h2 className="heading-display text-2xl">Filtros</h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} aria-label="Fechar filtros">
                <X className="size-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{filters}</div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/[0.06] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button variant="secondary" onClick={clearAll}>
                Limpar
              </Button>
              <Button onClick={() => setDrawerOpen(false)}>Ver {results.length} {results.length === 1 ? 'produto' : 'produtos'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

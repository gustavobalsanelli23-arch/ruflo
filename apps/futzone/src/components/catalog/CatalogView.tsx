'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
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
import { FilterSheet } from './FilterSheet';
import { productNoun, scopeProducts, type CatalogPreset } from './scope';

export type { CatalogPreset } from './scope';

const PAGE_SIZE = 12;

/*
 * Barra e arara grudam logo abaixo do Header (components/layout/Header.tsx).
 * A altura real dele é medida (ResizeObserver, nunca evento de scroll) e vira
 * --header-h: rolado, a barra fica h-14 e o aviso de demonstração recolhe; se
 * o Header mudar, os elementos grudados acompanham. 58px = h-14 + 2 bordas.
 */
const TOOLBAR_STICKY = 'top-[var(--header-h,58px)]';
const RACK_STICKY = 'lg:top-[calc(var(--header-h,58px)+1.5rem)] lg:max-h-[calc(100dvh-var(--header-h,58px)-3rem)]';

function useHeaderHeight(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    const header = document.querySelector<HTMLElement>('header.sticky');
    if (!el || !header || !('ResizeObserver' in window)) return;
    const apply = () => el.style.setProperty('--header-h', `${header.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => observer.disconnect();
  }, [root]);
}

const CHIP =
  'animate-pop inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-chip)] border border-line-strong bg-steel-2 pl-3 pr-2 text-xs font-semibold text-fg-2 transition-[border-color,color,transform] duration-150 ease-[var(--ease-out-fz)] hover:border-fg-2/60 hover:text-fg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';

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
  const sheetId = useId();
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const focusFromIndex = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useHeaderHeight(rootRef);

  const query = useMemo(() => queryFromParams(new URLSearchParams(params.toString())), [params]);

  const scoped = useMemo(
    () => scopeProducts(allProducts, preset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allProducts, preset.category, preset.teamId, preset.onSale],
  );

  const results = useMemo(() => queryCatalog(scoped, query), [scoped, query]);
  const shown = Math.min(visible, results.length);

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

  // Troca de filtro: a parede de armários "assenta" de novo (curto, nunca bloqueia).
  const resultsKey = useMemo(() => paramsFromQuery(query).toString(), [query]);
  const lastKey = useRef(resultsKey);
  useEffect(() => {
    if (lastKey.current === resultsKey) return;
    lastKey.current = resultsKey;
    const el = resultsRef.current;
    if (!el?.animate) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.animate(
      reduce ? [{ opacity: 0.6 }, { opacity: 1 }] : [{ opacity: 0.4, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
      { duration: reduce ? 150 : 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
  }, [resultsKey]);

  // "Carregar mais": o foco segue para o primeiro armário novo.
  useEffect(() => {
    const from = focusFromIndex.current;
    if (from === null) return;
    focusFromIndex.current = null;
    resultsRef.current?.querySelectorAll<HTMLAnchorElement>('article h3 a')[from]?.focus();
  }, [visible]);

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

  const loadMore = () => {
    focusFromIndex.current = visible;
    setVisible((v) => v + PAGE_SIZE);
  };

  const filters = <ProductFilters query={query} onChange={update} products={scoped} locked={locked} />;

  return (
    <div ref={rootRef} className="grid grid-cols-1 gap-8 lg:grid-cols-[17rem_1fr] xl:gap-12">
      {/* Arara de filtros (desktop) */}
      <aside className="hidden lg:block" aria-label="Filtros do catálogo">
        <div className={`sticky overflow-y-auto overscroll-contain pb-6 pr-3 [scrollbar-width:thin] ${RACK_STICKY}`}>{filters}</div>
      </aside>

      <div className="min-w-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar pelo nome da camisa, time ou temporada"
            aria-label="Buscar no catálogo"
            autoComplete="off"
            enterKeyHint="search"
            className="h-12 w-full rounded-xl border border-line-strong bg-steel pl-11 pr-12 text-[0.95rem] text-fg transition-[border-color,box-shadow] duration-150 placeholder:text-muted hover:border-fg-2/40 focus:border-brand-500 focus:shadow-[inset_0_0_0_1px_var(--color-brand-500)] focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm('')}
              className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-[background-color,color,transform] duration-150 hover:bg-white/[0.06] hover:text-fg active:scale-[0.94]"
              aria-label="Limpar busca"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>

        {/* Barra: gruda sob o header no celular; no desktop é a linha da prateleira */}
        <div
          className={`sticky ${TOOLBAR_STICKY} z-20 -mx-4 mt-3 flex min-h-14 items-center gap-3 border-b border-line bg-bg px-4 py-2 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mt-4 lg:min-h-0 lg:bg-transparent lg:px-0 lg:pb-3 lg:pt-0`}
        >
          <Button
            ref={filtersButtonRef}
            variant="outline"
            size="sm"
            className="shrink-0 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls={drawerOpen ? sheetId : undefined}
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.75} aria-hidden /> Filtros
            {filterCount > 0 && (
              <span key={filterCount} className="animate-pop grid min-w-5 place-items-center rounded-[2px] bg-fg px-1 text-[0.65rem] leading-5 tabular-nums tracking-normal text-bg">
                {filterCount}
              </span>
            )}
          </Button>
          <p className="min-w-0 truncate text-sm text-muted" aria-live="polite" aria-atomic="true">
            {hydrated ? (
              <>
                <span className="font-semibold tabular-nums text-fg">{results.length}</span> {productNoun(results.length)}
                {query.q && (
                  <>
                    {' '}para <span className="text-fg">“{query.q}”</span>
                  </>
                )}
              </>
            ) : (
              <span aria-hidden className="skeleton inline-block h-3.5 w-24 rounded-sm align-middle" />
            )}
          </p>
          <label className="ml-auto flex shrink-0 items-center gap-2.5 text-xs text-muted">
            <span className="hidden sm:inline">Ordenar por</span>
            <Select value={query.sort} onChange={(e) => update({ ...query, sort: e.target.value as SortKey })} className="h-10! w-[9.5rem] bg-steel! text-xs sm:w-40" aria-label="Ordenar produtos">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {(chips.length > 0 || query.q) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {query.q && (
              <button type="button" onClick={() => update({ ...query, q: '' })} className={CHIP}>
                Busca: {query.q} <X className="size-3.5 text-muted" strokeWidth={1.75} aria-hidden />
              </button>
            )}
            {chips.map((c) => (
              <button key={c.key} type="button" onClick={c.remove} className={CHIP}>
                {c.label} <X className="size-3.5 text-muted" strokeWidth={1.75} aria-hidden />
              </button>
            ))}
            {chips.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="ml-1 h-8 px-1 text-xs font-semibold text-fg-2 underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-fg hover:decoration-fg-2"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        <div ref={resultsRef} className="mt-5 sm:mt-6">
          {!hydrated ? (
            <ProductGridSkeleton count={8} />
          ) : results.length === 0 ? (
            <EmptyState
              headingLevel="h2"
              icon={<SearchX className="size-6" strokeWidth={1.75} />}
              title="Nenhuma camisa encontrada"
              description={query.q ? `Não encontramos resultados para “${query.q}”. Tente o nome de um time, jogador ou temporada.` : 'Nenhum produto combina com esses filtros. Tente remover alguns deles.'}
              action={
                <>
                  <Button onClick={() => update({ ...EMPTY_QUERY })}>Limpar busca e filtros</Button>
                  <Button variant="outline" onClick={() => router.push('/times')}>
                    Ver times
                  </Button>
                </>
              }
            />
          ) : (
            <>
              <ProductGrid products={results.slice(0, visible)} priorityCount={4} />
              <div className="mt-8 flex flex-col items-center gap-4 border-t border-line pt-6 sm:mt-10 sm:flex-row sm:justify-between">
                <p className="text-sm tabular-nums text-muted">
                  Mostrando <span className="font-semibold text-fg">{shown}</span> de {results.length}
                </p>
                {visible < results.length && (
                  <Button variant="outline" onClick={loadMore} className="w-full sm:w-auto">
                    Carregar mais
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <FilterSheet id={sheetId} open={drawerOpen} onClose={() => setDrawerOpen(false)} onClear={clearAll} resultCount={results.length} returnFocusRef={filtersButtonRef}>
        {filters}
      </FilterSheet>
    </div>
  );
}

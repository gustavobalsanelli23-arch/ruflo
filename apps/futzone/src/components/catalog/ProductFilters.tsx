'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { CategoryId, Product, Size } from '@/types/catalog';
import { ADULT_SIZES, KIDS_SIZES } from '@/types/catalog';
import { categories } from '@/data/categories';
import { collections, type CollectionId } from '@/data/collections';
import { teams } from '@/data/teams';
import { inCollection, normalize, PRICE_RANGES, type CatalogQuery } from '@/lib/catalog';
import { cn } from '@/lib/format';
import { Chip, Switch } from '@/components/ui/Form';

interface ProductFiltersProps {
  query: CatalogQuery;
  onChange(query: CatalogQuery): void;
  /** Produtos da vitrine atual: usados para contar itens por time e coleção. */
  products: Product[];
  /** Filtros fixados pela página (ex.: /retro) ficam ocultos. */
  locked?: { category?: boolean; team?: boolean; onSale?: boolean };
}

const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/**
 * Arara do vestiário: grupos de filtro empilhados, cada um com título e o
 * número de escolhas ativas. Renderizado duas vezes (lateral e gaveta do
 * celular), por isso não usa ids fixos.
 */
export function ProductFilters({ query, onChange, products, locked = {} }: ProductFiltersProps) {
  const [teamSearch, setTeamSearch] = useState('');
  const set = (patch: Partial<CatalogQuery>) => onChange({ ...query, ...patch });

  const teamCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1));
    return counts;
  }, [products]);

  const collectionCounts = useMemo(
    () => new Map(collections.map((c) => [c.id, products.filter((p) => inCollection(p, c.id)).length])),
    [products],
  );

  const term = normalize(teamSearch.trim());
  const visibleTeams = teams.filter((t) => teamCounts.has(t.id) && normalize(t.name).includes(term));
  const visibleCollections = collections.filter((c) => (collectionCounts.get(c.id) ?? 0) > 0 || query.collections.includes(c.id));
  const toggleSize = (s: Size) => set({ sizes: toggle(query.sizes, s) });

  return (
    <div className="border-t border-line">
      {visibleCollections.length > 0 && (
        <FilterGroup title="Coleções" active={query.collections.length}>
          <div className="flex flex-wrap gap-1.5">
            {visibleCollections.map((c) => {
              const selected = query.collections.includes(c.id);
              return (
                <Chip key={c.id} selected={selected} onClick={() => set({ collections: toggle<CollectionId>(query.collections, c.id) })}>
                  {c.name}
                  <span className={cn('tabular-nums', selected ? 'text-white/75' : 'text-muted')}>{collectionCounts.get(c.id)}</span>
                </Chip>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {!locked.category && (
        <FilterGroup title="Categoria" active={query.categories.length}>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Chip key={c.id} selected={query.categories.includes(c.id)} onClick={() => set({ categories: toggle<CategoryId>(query.categories, c.id) })}>
                {c.shortName}
              </Chip>
            ))}
          </div>
        </FilterGroup>
      )}

      {!locked.team && (
        <FilterGroup title="Time" active={query.teams.length}>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden />
            <input
              type="search"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Filtrar times"
              aria-label="Filtrar lista de times"
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-line-strong bg-steel pl-8 pr-9 text-sm text-fg transition-[border-color] duration-150 placeholder:text-muted hover:border-fg-2/40 focus:border-brand-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {teamSearch && (
              <button
                type="button"
                onClick={() => setTeamSearch('')}
                aria-label="Limpar filtro de times"
                className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors duration-150 hover:text-fg"
              >
                <X className="size-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
          <ul className="-mx-2 max-h-64 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            {visibleTeams.map((t) => {
              const checked = query.teams.includes(t.id);
              return (
                <li key={t.id}>
                  <label
                    className={cn(
                      'flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm transition-colors duration-150 hover:bg-white/[0.04] hover:text-fg',
                      checked ? 'text-fg' : 'text-fg-2',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => set({ teams: toggle(query.teams, t.id) })}
                      className="size-4 shrink-0 cursor-pointer rounded-[2px] accent-[var(--color-brand-600)]"
                    />
                    <span className={cn('min-w-0 flex-1 truncate', checked && 'font-semibold')}>{t.name}</span>
                    <span className="text-xs tabular-nums text-muted">{teamCounts.get(t.id)}</span>
                  </label>
                </li>
              );
            })}
            {visibleTeams.length === 0 && <li className="px-2 py-2 text-sm text-muted">Nenhum time encontrado.</li>}
          </ul>
        </FilterGroup>
      )}

      <FilterGroup title="Tamanho" active={query.sizes.length}>
        <p className="mb-2 text-xs font-semibold text-muted">Adulto</p>
        <SizeChips sizes={ADULT_SIZES} selected={query.sizes} onToggle={toggleSize} />
        <p className="mb-2 mt-4 text-xs font-semibold text-muted">Infantil</p>
        <SizeChips sizes={KIDS_SIZES} selected={query.sizes} onToggle={toggleSize} />
      </FilterGroup>

      <FilterGroup title="Preço" active={(query.price ? 1 : 0) + (query.onSale && !locked.onSale ? 1 : 0)}>
        <div className="grid grid-cols-2 gap-1.5">
          {PRICE_RANGES.map((r) => (
            <Chip key={r.id} className="justify-start! px-3! tabular-nums" selected={query.price === r.id} onClick={() => set({ price: query.price === r.id ? null : r.id })}>
              {r.label}
            </Chip>
          ))}
        </div>
        {!locked.onSale && (
          <div className="mt-4 border-t border-line pt-4">
            <Switch checked={query.onSale} onChange={(onSale) => set({ onSale })} label="Somente promoções" />
          </div>
        )}
      </FilterGroup>
    </div>
  );
}

function SizeChips({ sizes, selected, onToggle }: { sizes: Size[]; selected: Size[]; onToggle(s: Size): void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(2.9rem,1fr))] gap-1.5">
      {sizes.map((s) => (
        <Chip key={s} className="px-0! tabular-nums" selected={selected.includes(s)} onClick={() => onToggle(s)}>
          {s}
        </Chip>
      ))}
    </div>
  );
}

/** Grupo recolhível. Fechado, o painel fica `inert` (nada focável escondido). */
function FilterGroup({ title, active = 0, children }: { title: string; active?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-b border-line">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group flex min-h-12 w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
        >
          <span className="heading-display flex-1 text-[1.15rem] text-fg-2 transition-colors duration-150 group-hover:text-fg">{title}</span>
          {active > 0 && (
            <span className="text-xs font-semibold tabular-nums text-fg">
              {active} {active === 1 ? 'ativo' : 'ativos'}
            </span>
          )}
          <ChevronDown
            className={cn('size-4 text-muted transition-transform duration-200 ease-[var(--ease-out-fz)] group-hover:text-fg', open && 'rotate-180')}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </h3>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out-fz)]',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-5 pt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

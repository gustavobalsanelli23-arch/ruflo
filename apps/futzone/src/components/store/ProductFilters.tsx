'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { CategoryId, Product, Size } from '@/types/catalog';
import { ADULT_SIZES, KIDS_SIZES } from '@/types/catalog';
import { categories } from '@/data/categories';
import { teams } from '@/data/teams';
import { PRICE_RANGES, type CatalogQuery } from '@/lib/catalog';
import { cn } from '@/lib/format';
import { Chip, Switch } from '@/components/ui/Form';

interface ProductFiltersProps {
  query: CatalogQuery;
  onChange(query: CatalogQuery): void;
  /** Produtos da vitrine atual — usados para contar itens por time/categoria. */
  products: Product[];
  /** Filtros fixados pela página (ex.: /retro) ficam ocultos. */
  locked?: { category?: boolean; team?: boolean; onSale?: boolean };
}

const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export function ProductFilters({ query, onChange, products, locked = {} }: ProductFiltersProps) {
  const [teamSearch, setTeamSearch] = useState('');
  const set = (patch: Partial<CatalogQuery>) => onChange({ ...query, ...patch });

  const teamCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1));
    return counts;
  }, [products]);

  const visibleTeams = teams.filter(
    (t) => teamCounts.has(t.id) && t.name.toLowerCase().includes(teamSearch.toLowerCase()),
  );

  return (
    <div className="divide-y divide-line">
      {!locked.category && (
        <FilterGroup title="Categoria">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c.id} selected={query.categories.includes(c.id)} onClick={() => set({ categories: toggle<CategoryId>(query.categories, c.id) })}>
                {c.shortName}
              </Chip>
            ))}
          </div>
        </FilterGroup>
      )}

      {!locked.team && (
        <FilterGroup title="Time">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <input
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Filtrar times"
              aria-label="Filtrar lista de times"
              className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-3 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
          <ul className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
            {visibleTeams.map((t) => {
              const checked = query.teams.includes(t.id);
              return (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg">
                    <input type="checkbox" checked={checked} onChange={() => set({ teams: toggle(query.teams, t.id) })} className="size-4 rounded accent-[var(--color-brand-500)]" />
                    <span className={cn('flex-1', checked && 'font-semibold text-brand-200')}>{t.name}</span>
                    <span className="text-xs text-subtle">{teamCounts.get(t.id)}</span>
                  </label>
                </li>
              );
            })}
            {visibleTeams.length === 0 && <li className="px-2 py-1.5 text-xs text-muted">Nenhum time encontrado.</li>}
          </ul>
        </FilterGroup>
      )}

      <FilterGroup title="Tamanho">
        <p className="mb-2 text-[0.68rem] uppercase tracking-wider text-subtle">Adulto</p>
        <SizeChips sizes={ADULT_SIZES} selected={query.sizes} onToggle={(s) => set({ sizes: toggle(query.sizes, s) })} />
        <p className="mb-2 mt-3 text-[0.68rem] uppercase tracking-wider text-subtle">Infantil</p>
        <SizeChips sizes={KIDS_SIZES} selected={query.sizes} onToggle={(s) => set({ sizes: toggle(query.sizes, s) })} />
      </FilterGroup>

      <FilterGroup title="Preço">
        <div className="flex flex-col gap-1.5">
          {PRICE_RANGES.map((r) => (
            <Chip key={r.id} className="justify-start" selected={query.price === r.id} onClick={() => set({ price: query.price === r.id ? null : r.id })}>
              {r.label}
            </Chip>
          ))}
        </div>
        {!locked.onSale && (
          <div className="mt-4">
            <Switch checked={query.onSale} onChange={(onSale) => set({ onSale })} label="Somente promoções" />
          </div>
        )}
      </FilterGroup>
    </div>
  );
}

function SizeChips({ sizes, selected, onToggle }: { sizes: Size[]; selected: Size[]; onToggle(s: Size): void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {sizes.map((s) => (
        <Chip key={s} className="px-0" selected={selected.includes(s)} onClick={() => onToggle(s)}>
          {s}
        </Chip>
      ))}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="py-5 first:pt-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="mb-3 flex w-full items-center justify-between text-left" aria-expanded={open}>
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-fg">{title}</h3>
        <ChevronDown className={cn('size-4 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && children}
    </section>
  );
}

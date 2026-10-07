'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, PackageCheck, PackageX, Search } from 'lucide-react';
import type { CategoryId } from '@/types/catalog';
import { categories } from '@/data/categories';
import { useStoreData } from '@/context/StoreDataContext';
import { matchesSearch } from '@/lib/catalog';
import { cn } from '@/lib/format';
import { sizeStockLevel, stockLevel, STOCK_LABEL, totalStock, type StockLevel } from '@/lib/product';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { ProductImage } from '@/components/products/ProductImage';
import { AdminPageHeader, Panel } from './AdminUI';

type Filter = StockLevel | 'todos';

const LEVEL_TONE = { disponivel: 'success', baixo: 'warn', esgotado: 'danger' } as const;
const CELL = {
  disponivel: 'border-line bg-surface-2 text-fg',
  baixo: 'border-warn/40 bg-warn/10 text-warn',
  esgotado: 'border-danger/40 bg-danger/10 text-danger',
};

export function StockAdmin() {
  const { products, setStock, settings } = useStoreData();
  const threshold = settings.lowStockThreshold;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [category, setCategory] = useState<CategoryId | ''>('');

  const summary = useMemo(() => {
    const s = { disponivel: 0, baixo: 0, esgotado: 0 };
    products.forEach((p) => s[stockLevel(p, threshold)]++);
    return s;
  }, [products, threshold]);

  const list = products
    .filter((p) => matchesSearch(p, q) && (!category || p.category === category) && (filter === 'todos' || stockLevel(p, threshold) === filter))
    .sort((a, b) => totalStock(a) - totalStock(b));

  const cards: Array<{ key: StockLevel; icon: typeof PackageCheck; className: string }> = [
    { key: 'disponivel', icon: PackageCheck, className: 'text-success bg-success/12' },
    { key: 'baixo', icon: AlertTriangle, className: 'text-warn bg-warn/12' },
    { key: 'esgotado', icon: PackageX, className: 'text-danger bg-danger/12' },
  ];

  return (
    <>
      <AdminPageHeader title="Estoque" description={`Quantidades simuladas por produto e tamanho · estoque baixo: até ${threshold} unidades por produto`} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {cards.map(({ key, icon: Icon, className }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(filter === key ? 'todos' : key)}
            aria-pressed={filter === key}
            className={cn('flex items-center gap-4 rounded-2xl border bg-surface p-4 text-left transition-colors', filter === key ? 'border-brand-500 ring-1 ring-brand-500' : 'border-line hover:border-line-strong')}
          >
            <span className={cn('grid size-11 place-items-center rounded-xl', className)}><Icon className="size-5" /></span>
            <span>
              <span className="heading-display block text-4xl">{summary[key]}</span>
              <span className="text-xs uppercase tracking-wider text-muted">{key === 'disponivel' ? 'Disponíveis' : key === 'baixo' ? 'Estoque baixo' : 'Esgotados'}</span>
            </span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" aria-label="Buscar no estoque" className="h-11 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | '')} aria-label="Categoria" className="sm:w-44">
            <option value="">Todas as categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.shortName}</option>)}
          </Select>
          <Select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Situação" className="sm:w-44">
            <option value="todos">Todas as situações</option>
            {(['disponivel', 'baixo', 'esgotado'] as StockLevel[]).map((l) => <option key={l} value={l}>{STOCK_LABEL[l]}</option>)}
          </Select>
        </div>

        {list.length === 0 ? (
          <EmptyState className="m-4" title="Nenhum produto encontrado" />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((p) => {
              const level = stockLevel(p, threshold);
              return (
                <li key={p.id} className="flex flex-col gap-4 p-4 sm:px-5 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 items-center gap-3 xl:w-80">
                    <ProductImage product={p} className="h-14 w-12 shrink-0 rounded-lg" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone={LEVEL_TONE[level]} dot>{STOCK_LABEL[level]}</Badge>
                        <span className="text-xs text-muted">Total: <b className="text-fg">{totalStock(p)}</b></span>
                      </div>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-6">
                    {p.sizes.map((s) => {
                      const qty = p.stock[s] ?? 0;
                      const l = sizeStockLevel(qty, threshold);
                      return (
                        <label key={s} className={cn('flex items-center gap-2 rounded-lg border px-2 py-1.5', CELL[l])}>
                          <span className="w-7 text-xs font-bold">{s}</span>
                          <input
                            type="number"
                            min={0}
                            value={qty}
                            onChange={(e) => setStock(p.id, s, Number(e.target.value))}
                            aria-label={`Estoque de ${p.name}, tamanho ${s}`}
                            className="w-full min-w-0 bg-transparent text-right text-sm font-bold tabular-nums focus:outline-none"
                          />
                        </label>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <p className="mt-3 text-xs text-muted">Edite as quantidades diretamente nas células — as alterações são salvas localmente e refletem na loja imediatamente.</p>
    </>
  );
}

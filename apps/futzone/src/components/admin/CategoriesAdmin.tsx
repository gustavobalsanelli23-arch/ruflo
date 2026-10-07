'use client';

import { Lock } from 'lucide-react';
import { categories } from '@/data/categories';
import { collections, collectionHref } from '@/data/collections';
import { teams } from '@/data/teams';
import { useStoreData } from '@/context/StoreDataContext';
import { findByRef, isOnSale, teamById } from '@/lib/product';
import { ProductImage } from '@/components/products/ProductImage';
import { AdminButton, AdminCard, AdminPageHeader, AdminTable } from './AdminUI';

export function CategoriesAdmin() {
  const { products } = useStoreData();
  return (
    <>
      <AdminPageHeader title="Categorias" description="Coleções exibidas na loja, categorias de produto e times." />

      <h2 className="mb-3 text-sm font-bold text-fg">Coleções da loja</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {collections.map((c) => {
          const items = products.filter((p) => c.matches(p, teamById(p.teamId)));
          const cover = findByRef(products, c.cover);
          return (
            <AdminCard key={c.id} className="overflow-hidden">
              <div className="flex gap-4 p-4">
                {cover ? <ProductImage product={cover} className="h-20 w-16 shrink-0 rounded-lg" /> : <span className="h-20 w-16 shrink-0 rounded-lg bg-surface-2" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-fg">{c.name}</p>
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-fg-2">{items.length}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{c.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <a href={collectionHref(c.id)} target="_blank" rel="noopener" className="font-semibold text-brand-400 hover:text-brand-300">Ver na loja</a>
                    <AdminButton size="sm" variant="ghost" disabled className="h-6 px-1.5" title="A edição de coleções chega com o banco de dados">
                      <Lock className="size-3" /> Editar
                    </AdminButton>
                  </div>
                </div>
              </div>
            </AdminCard>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:gap-6 xl:grid-cols-[1fr_1.4fr]">
        <AdminCard title="Categorias de produto" description="Usadas no cadastro e nos filtros">
          <AdminTable head={['Categoria', 'Produtos', 'Publicados', 'Em promoção']} minWidth={420} caption="Categorias">
            {categories.map((c) => {
              const items = products.filter((p) => p.category === c.id);
              return (
                <tr key={c.id}>
                  <td className="font-semibold">{c.name}</td>
                  <td className="font-bold tabular-nums">{items.length}</td>
                  <td className="tabular-nums text-fg-2">{items.filter((p) => p.status === 'published').length}</td>
                  <td className="tabular-nums text-fg-2">{items.filter(isOnSale).length}</td>
                </tr>
              );
            })}
          </AdminTable>
        </AdminCard>

        <AdminCard title={`Times (${teams.length})`}>
          <div className="max-h-[480px] overflow-y-auto">
            <AdminTable head={['Time', 'Tipo', 'País', 'Produtos']} minWidth={480} caption="Times">
              {teams.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="flex items-center gap-3">
                      <span className="size-5 rounded ring-1 ring-white/10" style={{ background: `linear-gradient(135deg, ${t.colors.primary} 0 55%, ${t.colors.secondary} 55%)` }} aria-hidden />
                      <span className="font-semibold">{t.name}</span>
                    </span>
                  </td>
                  <td className="text-fg-2">{t.kind === 'clube' ? 'Clube' : 'Seleção'}</td>
                  <td className="text-fg-2">{t.country}</td>
                  <td className="font-bold tabular-nums">{products.filter((p) => p.teamId === t.id).length}</td>
                </tr>
              ))}
            </AdminTable>
          </div>
        </AdminCard>
      </div>
    </>
  );
}

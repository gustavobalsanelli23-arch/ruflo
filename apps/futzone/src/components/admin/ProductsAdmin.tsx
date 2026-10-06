'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { CategoryId, Product, ProductStatus } from '@/types/catalog';
import { categories, categoryById } from '@/data/categories';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { matchesSearch } from '@/lib/catalog';
import { formatPrice } from '@/lib/format';
import { STATUS_META } from '@/lib/productLabels';
import { productHref, stockLevel, teamById, totalStock } from '@/lib/product';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { ProductImage } from '@/components/store/ProductImage';
import { AdminPageHeader, AdminTable, Panel } from './AdminUI';

const STOCK_CLASS = { disponivel: 'text-fg', baixo: 'text-warn', esgotado: 'text-danger' } as const;

export function ProductsAdmin() {
  const { products, setProductStatus, deleteProduct, settings } = useStoreData();
  const { notify } = useToast();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<CategoryId | ''>('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [viewing, setViewing] = useState<Product | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);

  const list = useMemo(
    () => products.filter((p) => matchesSearch(p, q) && (!category || p.category === category) && (!status || p.status === status)),
    [products, q, category, status],
  );

  const toggle = (p: Product) => {
    const next: ProductStatus = p.status === 'published' ? 'inactive' : 'published';
    setProductStatus(p.id, next);
    notify(next === 'published' ? `"${p.name}" publicado na loja.` : `"${p.name}" desativado — não aparece mais na loja.`, next === 'published' ? 'success' : 'info');
  };

  const actions = (p: Product) => (
    <div className="flex items-center justify-end gap-1">
      <Button size="icon" variant="ghost" className="size-8" onClick={() => setViewing(p)} aria-label={`Visualizar ${p.name}`} title="Visualizar">
        <Eye className="size-4" />
      </Button>
      <Link href={`/admin/produtos/${p.id}`} className="grid size-8 place-items-center rounded-xl text-fg-2 hover:bg-surface-3 hover:text-fg" aria-label={`Editar ${p.name}`} title="Editar">
        <Pencil className="size-4" />
      </Link>
      <Button size="icon" variant="ghost" className="size-8" onClick={() => toggle(p)} aria-label={p.status === 'published' ? `Desativar ${p.name}` : `Publicar ${p.name}`} title={p.status === 'published' ? 'Desativar' : 'Publicar'}>
        {p.status === 'published' ? <EyeOff className="size-4" /> : <Eye className="size-4 text-brand-400" />}
      </Button>
      <Button size="icon" variant="ghost" className="size-8 hover:text-danger" onClick={() => setRemoving(p)} aria-label={`Excluir ${p.name}`} title="Excluir">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );

  return (
    <>
      <AdminPageHeader
        title="Produtos"
        description={`${products.length} produtos cadastrados · alterações salvas localmente neste navegador`}
        actions={
          <LinkButton href="/admin/produtos/novo">
            <Plus className="size-4" /> Adicionar produto
          </LinkButton>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, time ou temporada" aria-label="Buscar produtos" className="h-11 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | '')} aria-label="Filtrar por categoria" className="sm:w-44">
            <option value="">Todas as categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.shortName}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus | '')} aria-label="Filtrar por status" className="sm:w-40">
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_META) as ProductStatus[]).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </Select>
        </div>

        {list.length === 0 ? (
          <EmptyState className="m-4" title="Nenhum produto encontrado" description="Ajuste a busca ou os filtros." />
        ) : (
          <>
            <div className="hidden md:block">
              <AdminTable head={['Produto', 'Categoria', 'Time', 'Preço', 'Estoque', 'Status', <span key="a" className="sr-only">Ações</span>]} minWidth={880}>
                {list.map((p) => {
                  const level = stockLevel(p, settings.lowStockThreshold);
                  return (
                    <tr key={p.id} className="hover:bg-surface-2/50">
                      <td>
                        <div className="flex items-center gap-3">
                          <ProductImage product={p} className="h-14 w-12 shrink-0 rounded-lg" />
                          <div className="min-w-0">
                            <p className="max-w-64 truncate font-semibold">{p.name}</p>
                            <p className="text-xs text-muted">{p.id} · {p.season}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-fg-2">{categoryById(p.category)?.shortName}</td>
                      <td className="text-fg-2">{teamById(p.teamId)?.name}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        <span className="font-semibold">{formatPrice(p.price)}</span>
                        {p.compareAtPrice && p.compareAtPrice > p.price && <span className="block text-xs text-muted line-through">{formatPrice(p.compareAtPrice)}</span>}
                      </td>
                      <td className={`font-bold tabular-nums ${STOCK_CLASS[level]}`}>{totalStock(p)}</td>
                      <td><Badge tone={STATUS_META[p.status].tone} dot>{STATUS_META[p.status].label}</Badge></td>
                      <td>{actions(p)}</td>
                    </tr>
                  );
                })}
              </AdminTable>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {list.map((p) => (
                <li key={p.id} className="flex gap-3 p-4">
                  <ProductImage product={p} className="h-20 w-16 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">{categoryById(p.category)?.shortName} · {teamById(p.teamId)?.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{formatPrice(p.price)}</span>
                      <span className={`text-xs font-bold ${STOCK_CLASS[stockLevel(p, settings.lowStockThreshold)]}`}>{totalStock(p)} un.</span>
                      <Badge tone={STATUS_META[p.status].tone}>{STATUS_META[p.status].label}</Badge>
                    </div>
                    <div className="mt-2 -ml-2">{actions(p)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        description={viewing ? `${teamById(viewing.teamId)?.name} · ${categoryById(viewing.category)?.shortName} · ${viewing.season}` : undefined}
        size="lg"
        footer={
          viewing && (
            <>
              {viewing.status === 'published' && <LinkButton href={productHref(viewing)} variant="secondary" target="_blank">Ver na loja</LinkButton>}
              <LinkButton href={`/admin/produtos/${viewing.id}`}>Editar produto</LinkButton>
            </>
          )
        }
      >
        {viewing && (
          <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
            <ProductImage product={viewing} className="aspect-[4/5] w-full rounded-2xl border border-line" />
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone={STATUS_META[viewing.status].tone} dot>{STATUS_META[viewing.status].label}</Badge>
                <span className="font-bold">{formatPrice(viewing.price)}</span>
                {viewing.compareAtPrice && <span className="text-muted line-through">{formatPrice(viewing.compareAtPrice)}</span>}
              </div>
              <p className="text-fg-2">{viewing.description}</p>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Estoque por tamanho</p>
                <div className="flex flex-wrap gap-2">
                  {viewing.sizes.map((s) => (
                    <span key={s} className="rounded-lg border border-line px-2.5 py-1.5 text-xs">
                      <b className="text-brand-300">{s}</b> · {viewing.stock[s] ?? 0}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted">{viewing.images.length} {viewing.images.length === 1 ? 'imagem cadastrada' : 'imagens cadastradas'} · URL: {productHref(viewing)}</p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="Excluir produto?"
        description={`"${removing?.name}" será removido do catálogo local. Esta ação pode ser desfeita apenas restaurando os dados de exemplo em Configurações.`}
        confirmLabel="Excluir produto"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            deleteProduct(removing.id);
            notify(`"${removing.name}" excluído.`, 'info');
          }
          setRemoving(null);
        }}
      />
    </>
  );
}

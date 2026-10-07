'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, PackageCheck, Ruler, ShieldCheck, ShoppingBag, Shirt } from 'lucide-react';
import type { Size } from '@/types/catalog';
import { categoryById } from '@/data/categories';
import { useStoreData, usePublicProducts } from '@/context/StoreDataContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/format';
import { availableSizes, stockFor, teamById, teamBySlug } from '@/lib/product';
import { MAX_PER_ITEM } from '@/lib/cart';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState, SectionHeading } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ProductGallery } from './ProductGallery';
import { ProductGrid } from './ProductCard';
import { Price, SizeSelector, StockBadge, StockText } from './ProductBits';
import { SizeGuide } from './SizeGuide';

export function ProductDetail({ teamSlug, slug }: { teamSlug: string; slug: string }) {
  const { hydrated } = useStoreData();
  const products = usePublicProducts();
  const { add, open } = useCart();
  const { notify } = useToast();
  const [size, setSize] = useState<Size | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const team = teamBySlug(teamSlug);
  const product = products.find((p) => p.slug === slug && p.teamId === team?.id);

  if (!product) {
    if (!hydrated) return <div className="h-[60vh] animate-pulse rounded-3xl bg-surface" aria-busy="true" />;
    return (
      <EmptyState
        icon={<Shirt className="size-6" />}
        title="Produto não encontrado"
        description="Esta camisa pode ter sido removida ou não está mais disponível."
        action={<LinkButton href="/camisas">Ver catálogo</LinkButton>}
      />
    );
  }

  const category = categoryById(product.category);
  const maxQty = size ? Math.min(stockFor(product, size), MAX_PER_ITEM) : MAX_PER_ITEM;
  const soldOut = availableSizes(product).length === 0;

  const related = [
    ...products.filter((p) => p.id !== product.id && p.teamId === product.teamId),
    ...products.filter((p) => p.id !== product.id && p.teamId !== product.teamId && p.category === product.category),
  ].slice(0, 4);

  const handleAdd = () => {
    if (!size) {
      setSizeError(true);
      notify('Selecione um tamanho.', 'info');
      return;
    }
    const added = add(product.id, size, qty);
    if (added === 0) return notify('Você já tem a quantidade máxima disponível no carrinho.', 'warning');
    notify(added < qty ? `Adicionamos ${added} (limite de estoque).` : `${product.name} (${size}) adicionada ao carrinho.`);
    setQty(1);
    open();
  };

  return (
    <>
      <nav aria-label="Trilha" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:text-fg">Início</Link>
        <ChevronRight className="size-3" />
        <Link href="/camisas" className="hover:text-fg">Camisas</Link>
        <ChevronRight className="size-3" />
        <Link href={`/camisas/${team?.slug}`} className="hover:text-fg">{team?.name}</Link>
        <ChevronRight className="size-3" />
        <span className="truncate text-fg-2">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <ProductGallery product={product} />

        <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link href={`/camisas/${team?.slug}`} className="eyebrow hover:text-brand-300">{team?.name}</Link>
              <span className="text-subtle">·</span>
              <span className="text-xs uppercase tracking-wider text-muted">{category?.shortName}{product.season && ` · Temporada ${product.season}`}</span>
            </div>
            <h1 className="heading-display text-4xl sm:text-5xl">{product.name}</h1>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Price product={product} size="lg" />
            <StockBadge product={product} />
          </div>

          <p className="leading-relaxed text-fg-2">{product.description}</p>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">
                Tamanho {size && <span className="text-brand-300">· {size}</span>}
              </p>
              <button type="button" onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300">
                <Ruler className="size-3.5" /> Tabela de tamanhos
              </button>
            </div>
            <SizeSelector
              product={product}
              value={size}
              invalid={sizeError}
              onChange={(s) => {
                setSize(s);
                setSizeError(false);
                setQty((q) => Math.min(q, Math.min(stockFor(product, s), MAX_PER_ITEM)));
              }}
            />
            <div className={cn('mt-3 min-h-5 text-sm', sizeError && 'text-danger')}>
              {sizeError ? 'Escolha um tamanho para continuar.' : size ? <StockText product={product} size={size} /> : <span className="text-xs text-muted">Selecione um tamanho para ver a disponibilidade.</span>}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <QuantityStepper value={qty} max={Math.max(1, maxQty)} onChange={setQty} />
            <Button size="lg" className="flex-1" disabled={soldOut} onClick={handleAdd}>
              <ShoppingBag className="size-5" />
              {soldOut ? 'Esgotado' : 'Adicionar ao carrinho'}
            </Button>
          </div>

          <ul className="grid gap-3 rounded-2xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-3 text-fg-2"><PackageCheck className="size-5 shrink-0 text-brand-400" /> Produto conferido antes do envio</li>
            <li className="flex items-center gap-3 text-fg-2"><ShieldCheck className="size-5 shrink-0 text-brand-400" /> Troca facilitada em até 7 dias</li>
          </ul>

          <details className="group rounded-2xl border border-line bg-surface" open>
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold">
              Detalhes do produto
              <ChevronRight className="size-4 text-muted transition-transform group-open:rotate-90" />
            </summary>
            <ul className="space-y-2 px-5 pb-5 text-sm text-fg-2">
              {product.details.map((d) => (
                <li key={d} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{d}</li>
              ))}
              <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />Tamanhos: {product.sizes.join(', ')}</li>
            </ul>
          </details>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="heading-display mb-5 text-3xl">Tabela de tamanhos</h2>
        <SizeGuide kids={product.gender === 'infantil'} />
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <SectionHeading eyebrow="Você também pode gostar" title="Produtos relacionados" />
          <ProductGrid products={related} />
        </section>
      )}

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Tabela de tamanhos" description={teamById(product.teamId)?.name} size="lg">
        <SizeGuide kids={product.gender === 'infantil'} />
      </Modal>
    </>
  );
}

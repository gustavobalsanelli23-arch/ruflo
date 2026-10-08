'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { Check, Plus, X } from 'lucide-react';
import type { Product, Size } from '@/types/catalog';
import { categoryById } from '@/data/categories';
import { cn } from '@/lib/format';
import { availableSizes, badgesFor, discountPercent, productHref, stockFor, teamById, type BadgeKind } from '@/lib/product';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Reveal, stagger } from '@/components/ui/Reveal';
import { ProductImage } from './ProductImage';
import { FavoriteButton } from './FavoriteButton';
import { Price, StockText } from './ProductBits';

const BADGE_STYLE: Record<BadgeKind, string> = {
  esgotado: 'bg-black/70 text-white/80',
  promo: 'bg-brand-500 text-white',
  novo: 'bg-white text-bg',
  'mais-vendido': 'bg-brand-500 text-white',
  destaque: 'bg-black/60 text-white',
  retro: 'bg-black/60 text-white',
  kit: 'bg-black/60 text-white',
  infantil: 'bg-black/60 text-white',
};

const BADGE_LABEL: Record<BadgeKind, string> = {
  esgotado: 'Esgotado',
  promo: '',
  novo: 'Novo',
  'mais-vendido': 'Mais vendido',
  destaque: 'Destaque',
  retro: 'Retrô',
  kit: 'Kit',
  infantil: 'Infantil',
};

interface ProductCardProps {
  product: Product;
  /** Primeiras imagens da página carregam com prioridade. */
  priority?: boolean;
}

function ProductCardBase({ product, priority }: ProductCardProps) {
  const { add, open } = useCart();
  const { notify } = useToast();
  const [picking, setPicking] = useState(false);
  const [added, setAdded] = useState<Size | null>(null);
  const href = productHref(product);
  const team = teamById(product.teamId);
  const sizes = availableSizes(product);
  const soldOut = sizes.length === 0;
  const badges = badgesFor(product);

  const addSize = (size: Size) => {
    const qty = add(product.id, size, 1);
    if (qty === 0) {
      notify('Você já tem a quantidade máxima disponível no carrinho.', 'warning');
      return;
    }
    setAdded(size);
    setPicking(false);
    notify(`${product.name} (${size}) adicionada ao carrinho.`);
    window.setTimeout(() => open(), 250);
    window.setTimeout(() => setAdded(null), 1600);
  };

  const quickAdd = () => (sizes.length === 1 ? addSize(sizes[0]) : setPicking((v) => !v));

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative z-10 overflow-hidden rounded-[var(--radius-card)] bg-surface-2 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-fz)] group-hover:-translate-y-1 group-hover:shadow-[0_24px_40px_-24px_rgba(0,0,0,0.9)]">
        <Link href={href} aria-label={product.name} tabIndex={-1} className="block">
          <ProductImage
            product={product}
            priority={priority}
            hoverSwap
            className="aspect-[3/4] w-full"
            imageClassName={cn('transition-transform duration-500 ease-[var(--ease-out-fz)] group-hover:scale-[1.04]', soldOut && 'opacity-60 grayscale')}
          />
        </Link>

        <FavoriteButton
          productId={product.id}
          productName={product.name}
          className="absolute right-2.5 top-2.5 size-9 rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/65 sm:right-3 sm:top-3"
        />

        {badges.length > 0 && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
            {badges.map((b) => (
              <span key={b} className={cn('rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] backdrop-blur-sm', BADGE_STYLE[b])}>
                {b === 'promo' ? `-${discountPercent(product)}%` : BADGE_LABEL[b]}
              </span>
            ))}
          </div>
        )}

        {!soldOut && (
          <>
            {/* Compra rápida: tamanhos sobre a foto (hover no desktop, botão + no mobile) */}
            <div
              className={cn(
                'absolute inset-x-2 bottom-2 rounded-2xl bg-bg/80 p-2.5 backdrop-blur-md transition-[opacity,transform] duration-200 ease-[var(--ease-out-fz)] sm:inset-x-3 sm:bottom-3',
                picking
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-2 opacity-0 lg:group-focus-within:pointer-events-auto lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100',
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-fg-2">Adicionar rápido</p>
                {picking && (
                  <button type="button" onClick={() => setPicking(false)} className="text-muted hover:text-fg lg:hidden" aria-label="Fechar tamanhos">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {product.sizes.map((s) => {
                  const out = stockFor(product, s) <= 0;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={out}
                      onClick={() => addSize(s)}
                      aria-label={`Adicionar tamanho ${s}${out ? ' (esgotado)' : ''}`}
                      className={cn(
                        'h-8 min-w-9 rounded-lg px-2 text-xs font-bold tabular-nums transition-[background-color,color,transform] duration-150 active:scale-95',
                        out ? 'cursor-not-allowed text-subtle line-through' : 'bg-white/[0.08] text-fg hover:bg-brand-500 hover:text-white',
                        added === s && 'bg-brand-500 text-white',
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={quickAdd}
              aria-label={added ? 'Adicionado ao carrinho' : `Adicionar ${product.name} ao carrinho`}
              aria-expanded={sizes.length > 1 ? picking : undefined}
              className={cn(
                'absolute bottom-2.5 right-2.5 grid size-10 place-items-center rounded-full shadow-lg transition-[background-color,transform,opacity] duration-200 active:scale-90 lg:hidden',
                added ? 'bg-success text-white' : 'bg-white text-bg',
                picking && 'pointer-events-none scale-75 opacity-0',
              )}
            >
              {added ? <Check className="size-5" /> : <Plus className="size-5" />}
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-0.5 pt-3.5">
        <p className="truncate text-[0.66rem] font-bold uppercase tracking-[0.16em] text-muted">
          <span className="text-brand-400">{team?.name}</span>
          <span className="mx-1.5 text-subtle">·</span>
          {categoryById(product.category)?.shortName}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-fg sm:text-[0.95rem]">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-1.5">
          <Price product={product} />
          <StockText product={product} />
        </div>
      </div>
      {added && (
        <span className="animate-pop pointer-events-none absolute left-1/2 top-3 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-white">
          <Check className="size-3" /> {added}
        </span>
      )}
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);

/** Grade responsiva: 2 colunas (celular), 3 (tablet), 4 (desktop). */
export function ProductGrid({ products, className, priorityCount = 0 }: { products: Product[]; className?: string; priorityCount?: number }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10', className)}>
      {products.map((p, i) => (
        <Reveal key={p.id} delay={stagger(i % 4, 60)} className="h-full">
          <ProductCard product={p} priority={i < priorityCount} />
        </Reveal>
      ))}
    </div>
  );
}

/** Trilho horizontal com rolagem por arraste no celular; vira grade no desktop. */
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
      {products.map((p, i) => (
        <Reveal key={p.id} delay={stagger(i, 60, 4)} className="w-[62%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
          <ProductCard product={p} />
        </Reveal>
      ))}
    </div>
  );
}

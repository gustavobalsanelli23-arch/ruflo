'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import type { Product, Size } from '@/types/catalog';
import { cn } from '@/lib/format';
import { availableSizes, discountPercent, isOnSale, productHref, teamById } from '@/lib/product';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProductImage } from './ProductImage';
import { Price, SizeSelector, StockText, useStockLevel } from './ProductBits';

export function ProductCard({ product }: { product: Product }) {
  const { add, open } = useCart();
  const { notify } = useToast();
  const [size, setSize] = useState<Size | null>(null);
  const [needsSize, setNeedsSize] = useState(false);
  const level = useStockLevel(product);
  const href = productHref(product);
  const soldOut = level === 'esgotado';
  const team = teamById(product.teamId);

  const handleAdd = () => {
    const sizes = availableSizes(product);
    const chosen = size ?? (sizes.length === 1 ? sizes[0] : null);
    if (!chosen) {
      setNeedsSize(true);
      notify('Escolha um tamanho para adicionar ao carrinho.', 'info');
      return;
    }
    const added = add(product.id, chosen, 1);
    if (added > 0) {
      notify(`${product.name} (${chosen}) adicionada ao carrinho.`);
      open();
    } else {
      notify('Quantidade máxima disponível já está no carrinho.', 'warning');
    }
  };

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-all duration-300',
        'hover:-translate-y-1 hover:border-brand-500/50 hover:shadow-[0_20px_40px_-24px_var(--color-brand-500)]',
      )}
    >
      <Link href={href} className="relative block" aria-label={product.name} tabIndex={-1}>
        <ProductImage
          product={product}
          className="aspect-[4/5] w-full"
          imageClassName={cn('transition-transform duration-500 group-hover:scale-[1.04]', soldOut && 'opacity-50 grayscale')}
        />
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
          {isOnSale(product) && <Badge tone="solid">-{discountPercent(product)}%</Badge>}
          {product.tags.includes('lancamento') && <Badge tone="neutral">Lançamento</Badge>}
          {soldOut && <Badge tone="danger">Esgotado</Badge>}
        </div>
        {product.images.length === 0 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-[0.58rem] uppercase tracking-wider text-white/60">Ilustrativa</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:p-4">
        <div>
          <p className="mb-0.5 truncate text-[0.68rem] font-bold uppercase tracking-[0.16em] text-brand-400">{team?.name}</p>
          <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight text-fg sm:text-[0.95rem]">
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">
              {product.name}
            </Link>
          </h3>
        </div>

        <Price product={product} />
        <StockText product={product} />

        <div className="relative z-10">
          <SizeSelector
            product={product}
            value={size}
            compact
            invalid={needsSize}
            onChange={(s) => {
              setSize(s);
              setNeedsSize(false);
            }}
          />
        </div>

        <Button className="relative z-10 mt-auto" size="sm" block disabled={soldOut} onClick={handleAdd}>
          <ShoppingBag className="size-4" />
          {soldOut ? 'Esgotado' : 'Adicionar'}
        </Button>
        {needsSize && <p className="-mt-1 text-center text-[0.7rem] text-danger">Selecione um tamanho</p>}
      </div>
    </article>
  );
}

export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5', className)}>
      {products.map((p, i) => (
        <div key={p.id} className="animate-fade-up h-full" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

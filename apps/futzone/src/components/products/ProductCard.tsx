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
import { Price } from './ProductBits';

/** Uma única palavra de situação por armário (sem selos sobre a foto). */
const STATUS_LABEL: Partial<Record<BadgeKind, string>> = {
  esgotado: 'Esgotado',
  novo: 'Lançamento',
  'mais-vendido': 'Mais vendido',
};

function statusOf(product: Product, omit?: BadgeKind): { label: string; tone: 'muted' | 'danger' | 'fg' } | null {
  const badges = badgesFor(product, 4);
  if (badges.includes('esgotado')) return { label: 'Esgotado', tone: 'danger' };
  if (badges.includes('promo')) return { label: `-${discountPercent(product)}%`, tone: 'fg' };
  const kind = badges.find((b) => b !== omit && STATUS_LABEL[b]);
  return kind ? { label: STATUS_LABEL[kind] as string, tone: 'muted' } : null;
}

interface ProductCardProps {
  product: Product;
  /** Primeiras imagens da página carregam com prioridade. */
  priority?: boolean;
  /**
   * Armário aceso: a luz do teto fica ligada (vitrine da Home). `litDelay`
   * escalona o acendimento, como as lâmpadas do vestiário ligando uma a uma.
   */
  lit?: boolean;
  litDelay?: number;
  /** Situação que a prateleira já anuncia no título (ex.: "Mais vendidas"): não repete no armário. */
  omitStatus?: BadgeKind;
}

/**
 * Armário do vestiário: plaquinha (time e temporada), o nicho com a camisa
 * sob a luz do teto e a etiqueta (nome, preço, grade de tamanhos).
 */
function ProductCardBase({ product, priority, lit, litDelay = 0, omitStatus }: ProductCardProps) {
  const { add, open } = useCart();
  const { notify } = useToast();
  const [picking, setPicking] = useState(false);
  const [added, setAdded] = useState<Size | null>(null);
  const href = productHref(product);
  const team = teamById(product.teamId);
  const sizes = availableSizes(product);
  const soldOut = sizes.length === 0;
  const status = statusOf(product, omitStatus);
  const plateRight = product.season || categoryById(product.category)?.shortName || '';

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
  const lightDelay = { animationDelay: `${litDelay}ms` };

  return (
    <article className="locker group relative flex h-full flex-col rounded-[var(--radius-card)] transition-[border-color] duration-200 hover:border-line-strong focus-within:border-line-strong">
      {/* Plaquinha do armário */}
      <div className="flex h-9 items-center justify-between gap-3 border-b border-line px-3">
        <span className="plate truncate text-[0.82rem] text-fg-2 transition-colors duration-200 group-hover:text-fg">{team?.name}</span>
        {plateRight && <span className="plate shrink-0 text-[0.74rem] tabular-nums text-muted">{plateRight}</span>}
      </div>

      {/* Nicho: a camisa sob a luz do teto */}
      <div className="relative isolate z-10 overflow-hidden bg-[#0a0c10]">
        <span
          aria-hidden
          style={lit ? lightDelay : undefined}
          className={cn(
            'pointer-events-none absolute inset-x-[14%] top-0 z-20 h-[2px] bg-light transition-opacity duration-200',
            lit ? 'animate-light-on' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        />
        <span
          aria-hidden
          style={lit ? { animationDelay: `${litDelay + 220}ms` } : undefined}
          className={cn(
            'pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(62%_40%_at_50%_0%,rgb(219_230_255/0.2),transparent_78%)] mix-blend-screen transition-opacity duration-300',
            lit ? 'animate-cone-on' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        />
        <Link href={href} aria-label={product.name} tabIndex={-1} className="block">
          <ProductImage
            product={product}
            priority={priority}
            hoverSwap
            className="aspect-[3/4] w-full bg-transparent"
            imageClassName={cn('motion-lift origin-top transition-transform duration-500 ease-[var(--ease-out-fz)] group-hover:scale-[1.03]', soldOut && 'opacity-55 grayscale')}
          />
        </Link>

        <FavoriteButton
          productId={product.id}
          productName={product.name}
          className="absolute right-2 top-2 z-30 size-9 rounded-xl bg-bg/75 text-white hover:bg-bg"
        />

        {!soldOut && (
          <>
            {/* Gaveta de compra rápida: sobe ao passar o mouse (desktop) ou pelo botão + (celular) */}
            <div
              className={cn(
                'absolute inset-x-0 bottom-0 z-30 border-t border-line-strong bg-steel-2/95 p-2.5 transition-[transform,opacity] duration-200 ease-[var(--ease-out-fz)]',
                picking
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-full opacity-0 lg:group-focus-within:pointer-events-auto lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100',
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-fg-2">Adicionar rápido</p>
                {picking && (
                  <button type="button" onClick={() => setPicking(false)} className="grid size-6 place-items-center text-muted hover:text-fg lg:hidden" aria-label="Fechar tamanhos">
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
                        out ? 'cursor-not-allowed text-subtle line-through' : 'bg-white/[0.07] text-fg hover:bg-brand-600 hover:text-white',
                        added === s && 'bg-brand-600 text-white',
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
                'absolute bottom-2 right-2 z-30 grid size-10 place-items-center rounded-xl transition-[background-color,transform,opacity] duration-150 active:scale-90 lg:hidden',
                added ? 'bg-success text-white' : 'bg-fg text-bg',
                picking && 'pointer-events-none scale-90 opacity-0',
              )}
            >
              {added ? <Check className="size-5" /> : <Plus className="size-5" />}
            </button>
          </>
        )}

        {added && (
          <span className="animate-pop pointer-events-none absolute left-2 top-2 z-30 inline-flex items-center gap-1 rounded-xl bg-success px-2.5 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-white">
            <Check className="size-3" /> {added} no carrinho
          </span>
        )}
      </div>

      {/* Etiqueta: nome, preço e grade */}
      <div className="flex flex-1 flex-col gap-2 border-t border-line px-3 pb-3 pt-2.5">
        <h3 className="line-clamp-2 text-[0.82rem] font-semibold leading-snug text-fg sm:text-[0.92rem]">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-0.5">
          <Price product={product} />
          {status && (
            <span
              className={cn(
                'shrink-0 pb-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em]',
                status.tone === 'danger' ? 'text-danger' : status.tone === 'fg' ? 'text-fg' : 'text-muted',
              )}
            >
              {status.label}
            </span>
          )}
        </div>
        <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-[0.68rem] font-semibold tabular-nums tracking-wide" aria-label={soldOut ? 'Sem tamanhos disponíveis' : `Tamanhos disponíveis: ${sizes.join(', ')}`}>
          {product.sizes.map((s) => (
            <span key={s} aria-hidden className={stockFor(product, s) > 0 ? 'text-fg-2' : 'text-subtle line-through decoration-subtle'}>
              {s}
            </span>
          ))}
        </p>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardBase);

/** Parede de armários: 2 colunas (celular), 3 (tablet), 4 (desktop). */
export function ProductGrid({ products, className, priorityCount = 0 }: { products: Product[]; className?: string; priorityCount?: number }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4', className)}>
      {products.map((p, i) => (
        <Reveal key={p.id} delay={stagger(i % 4, 60)} className="h-full">
          <ProductCard product={p} priority={i < priorityCount} />
        </Reveal>
      ))}
    </div>
  );
}

/** Fileira de armários: rolagem lateral com encaixe no celular; vira grade no desktop. */
export function ProductRail({ products, omitStatus }: { products: Product[]; omitStatus?: BadgeKind }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:gap-3 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0">
      {products.map((p, i) => (
        <Reveal key={p.id} delay={stagger(i, 60, 4)} className="w-[64%] shrink-0 snap-start sm:w-[40%] lg:w-auto">
          <ProductCard product={p} omitStatus={omitStatus} />
        </Reveal>
      ))}
    </div>
  );
}

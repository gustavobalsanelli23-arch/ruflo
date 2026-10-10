'use client';

import { useEffect, useRef } from 'react';
import type { Product, Size } from '@/types/catalog';
import { cn, formatPrice } from '@/lib/format';
import { discountPercent, isOnSale, sizeStockLevel, STOCK_LABEL, stockFor, stockLevel, type StockLevel } from '@/lib/product';
import { useStoreData } from '@/context/StoreDataContext';

/** Preço atual (sempre branco), preço anterior riscado e o desconto real. */
export function Price({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  const sale = isOnSale(product);
  const lg = size === 'lg';
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={cn('font-extrabold tabular-nums text-fg', lg ? 'text-3xl sm:text-4xl' : 'text-base sm:text-lg')}>
        {sale && <span className="sr-only">Preço atual: </span>}
        {formatPrice(product.price)}
      </span>
      {sale && (
        <>
          <s className={cn('tabular-nums text-muted decoration-muted', lg ? 'text-base' : 'text-xs sm:text-sm')}>
            <span className="sr-only">Preço anterior: </span>
            {formatPrice(product.compareAtPrice as number)}
          </s>
          {lg && (
            <span className="self-center rounded-[var(--radius-chip)] border border-line-strong px-1.5 py-0.5 text-xs font-bold tabular-nums text-fg">
              -{discountPercent(product)}%
            </span>
          )}
        </>
      )}
    </div>
  );
}

/** Lâmpada de estado (quadradinha, como um LED do vestiário): a cor é o único sinal semântico. */
const STOCK_LED: Record<StockLevel, string> = { disponivel: 'bg-success', baixo: 'bg-warn', esgotado: 'bg-danger' };

function StockLine({ level, children }: { level: StockLevel; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-fg-2">
      <span className={cn('size-[7px] shrink-0 rounded-[1px]', STOCK_LED[level])} aria-hidden />
      {children}
    </span>
  );
}

export function useStockLevel(product: Product): StockLevel {
  const { settings } = useStoreData();
  return stockLevel(product, settings.lowStockThreshold);
}

/** Situação do produto inteiro: LED + rótulo ("Disponível", "Últimas unidades", "Esgotado"). */
export function StockBadge({ product }: { product: Product }) {
  const level = useStockLevel(product);
  return <StockLine level={level}>{STOCK_LABEL[level]}</StockLine>;
}

/** Estoque em texto: do tamanho escolhido ou, sem tamanho, do produto. */
export function StockText({ product, size }: { product: Product; size?: Size }) {
  const { settings } = useStoreData();
  const level = size ? sizeStockLevel(stockFor(product, size), settings.lowStockThreshold) : stockLevel(product, settings.lowStockThreshold);
  const qty = size ? stockFor(product, size) : undefined;
  const text =
    level === 'esgotado'
      ? 'Esgotado'
      : level === 'baixo'
        ? qty !== undefined
          ? `Restam ${qty} ${qty === 1 ? 'unidade' : 'unidades'}`
          : 'Últimas unidades'
        : 'Em estoque';
  return <StockLine level={level}>{text}</StockLine>;
}

/** Sacudida curta da grade (WAAPI): recomeça a cada tentativa, some com movimento reduzido. */
const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-3px)', offset: 0.2 },
  { transform: 'translateX(3px)', offset: 0.4 },
  { transform: 'translateX(-3px)', offset: 0.6 },
  { transform: 'translateX(3px)', offset: 0.8 },
  { transform: 'translateX(0)' },
];

interface SizeSelectorProps {
  product: Product;
  value: Size | null;
  onChange(size: Size): void;
  compact?: boolean;
  invalid?: boolean;
  /** Muda a cada tentativa de compra sem tamanho: a grade sacode de novo. */
  shakeSignal?: number;
}

/**
 * Grade de tamanhos: placas de aço quadradas. A escolhida acende no azul da
 * marca; esgotadas ficam riscadas e desabilitadas. Setas, Home e End movem a
 * escolha entre os tamanhos disponíveis (padrão de grupo de rádio).
 */
export function SizeSelector({ product, value, onChange, compact, invalid, shakeSignal = 0 }: SizeSelectorProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const available = product.sizes.filter((s) => stockFor(product, s) > 0);
  // Só um tamanho entra na ordem do Tab: o escolhido ou, sem escolha, o primeiro disponível.
  const tabStop = value && available.includes(value) ? value : available[0];

  useEffect(() => {
    const el = groupRef.current;
    if (!shakeSignal || !el?.animate) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const anim = el.animate(SHAKE, { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    return () => anim.cancel();
  }, [shakeSignal]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key) || !available.length) return;
    e.preventDefault();
    const from = value ? available.indexOf(value) : -1;
    const last = available.length - 1;
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? last : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (from + 1) % available.length : from <= 0 ? last : from - 1;
    const size = available[next];
    onChange(size);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-size="${size}"]`)?.focus();
  };

  return (
    <div ref={groupRef} role="radiogroup" aria-label="Tamanho" onKeyDown={onKeyDown} className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-2')}>
      {product.sizes.map((s) => {
        const out = stockFor(product, s) <= 0;
        const selected = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            data-size={s}
            aria-checked={selected}
            aria-label={`Tamanho ${s}${out ? ' (esgotado)' : ''}`}
            disabled={out}
            tabIndex={s === tabStop ? 0 : -1}
            onClick={() => onChange(s)}
            className={cn(
              'grid place-items-center rounded-[var(--radius-button)] border font-bold tabular-nums transition-[background-color,border-color,color,scale] duration-150 ease-[var(--ease-out-fz)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              compact ? 'h-7 min-w-7 px-1.5 text-[0.68rem]' : 'h-12 min-w-12 px-3 text-sm',
              out
                ? 'cursor-not-allowed border-line bg-transparent text-subtle line-through decoration-subtle'
                : selected
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : cn('bg-steel-2 text-fg-2 hover:border-fg-2/60 hover:text-fg active:scale-[0.97]', invalid ? 'border-danger/70' : 'border-line-strong'),
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import type { Product, Size } from '@/types/catalog';
import { cn, formatPrice } from '@/lib/format';
import { discountPercent, isOnSale, sizeStockLevel, STOCK_LABEL, stockFor, stockLevel, type StockLevel } from '@/lib/product';
import { useStoreData } from '@/context/StoreDataContext';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

/** Preço atual, preço anterior e desconto. */
export function Price({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  const sale = isOnSale(product);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={cn('font-extrabold tabular-nums', sale ? 'text-brand-300' : 'text-fg', size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-base sm:text-lg')}>
        {formatPrice(product.price)}
      </span>
      {sale && (
        <>
          <span className={cn('text-muted line-through tabular-nums', size === 'lg' ? 'text-base' : 'text-xs sm:text-sm')}>
            {formatPrice(product.compareAtPrice as number)}
          </span>
          {size === 'lg' && <Badge tone="solid">-{discountPercent(product)}%</Badge>}
        </>
      )}
    </div>
  );
}

const STOCK_TONE: Record<StockLevel, BadgeTone> = { disponivel: 'success', baixo: 'warn', esgotado: 'danger' };
const STOCK_DOT: Record<StockLevel, string> = { disponivel: 'bg-success', baixo: 'bg-warn', esgotado: 'bg-danger' };

export function useStockLevel(product: Product): StockLevel {
  const { settings } = useStoreData();
  return stockLevel(product, settings.lowStockThreshold);
}

export function StockBadge({ product }: { product: Product }) {
  const level = useStockLevel(product);
  return (
    <Badge tone={STOCK_TONE[level]} dot>
      {STOCK_LABEL[level]}
    </Badge>
  );
}

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
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fg-2">
      <span className={cn('size-1.5 rounded-full', STOCK_DOT[level])} aria-hidden />
      {text}
    </span>
  );
}

interface SizeSelectorProps {
  product: Product;
  value: Size | null;
  onChange(size: Size): void;
  compact?: boolean;
  invalid?: boolean;
}

/** Seleção de tamanho. Esgotados aparecem riscados e desabilitados. */
export function SizeSelector({ product, value, onChange, compact, invalid }: SizeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Tamanho" className={cn('flex flex-wrap', compact ? 'gap-1' : 'gap-2')}>
      {product.sizes.map((s) => {
        const out = stockFor(product, s) <= 0;
        const selected = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Tamanho ${s}${out ? ' (esgotado)' : ''}`}
            disabled={out}
            onClick={() => onChange(s)}
            className={cn(
              'relative grid place-items-center rounded-lg border font-bold tabular-nums transition-all',
              compact ? 'h-7 min-w-7 px-1.5 text-[0.68rem]' : 'h-12 min-w-12 px-3 text-sm',
              selected
                ? 'border-brand-500 bg-brand-500 text-white shadow-[0_6px_18px_-8px_var(--color-brand-500)]'
                : invalid
                  ? 'border-danger/60 text-fg-2'
                  : 'border-line text-fg-2 hover:border-brand-400 hover:text-fg',
              out && 'cursor-not-allowed border-line/60 text-subtle line-through decoration-subtle hover:border-line/60 hover:text-subtle',
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

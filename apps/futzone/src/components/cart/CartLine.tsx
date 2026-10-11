'use client';

import Link from 'next/link';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { CartLine } from '@/lib/cart';
import { useCart } from '@/context/CartContext';
import { cn, formatPrice } from '@/lib/format';
import { productHref, teamById } from '@/lib/product';
import { STOCK_ISSUE_MESSAGE } from '@/services/inventory.service';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ProductImage } from '@/components/products/ProductImage';

type ThumbSize = 'xs' | 'sm' | 'md';

const THUMB_WIDTH: Record<ThumbSize, string> = {
  xs: 'w-12',
  sm: 'w-[4.75rem]',
  md: 'w-24 sm:w-28',
};

/**
 * Foto do item no nicho do armário (3:4): a foto do catálogo, a cópia salva
 * no carrinho quando o produto saiu de venda, ou o nicho vazio. Decorativa:
 * o nome do produto está sempre ao lado.
 */
export function LineThumb({ line, size = 'sm', className }: { line: Pick<CartLine, 'product' | 'image' | 'status'>; size?: ThumbSize; className?: string }) {
  const dim = line.status === 'indisponivel' ? 'opacity-55 grayscale' : undefined;
  return (
    <span aria-hidden className={cn('relative block aspect-[3/4] shrink-0 overflow-hidden bg-[#0a0c10]', THUMB_WIDTH[size], className)}>
      {line.product ? (
        <ProductImage product={line.product} className="h-full w-full bg-transparent" imageClassName={dim} />
      ) : line.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={line.image} alt="" width={720} height={960} loading="lazy" decoding="async" className={cn('h-full w-full object-cover', dim)} />
      ) : null}
    </span>
  );
}

const TEXT_ACTION =
  '-my-1 inline-flex h-8 items-center rounded-[var(--radius-button)] px-1 font-bold underline underline-offset-2 transition-[text-decoration-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';

/**
 * Item do carrinho como um armário pequeno: o nicho com a camisa, a plaquinha
 * (time e tamanho), o nome e o preço, e a faixa com a quantidade e o subtotal.
 * Na gaveta (e no celular) a faixa ocupa a largura toda, embaixo; na página,
 * a partir do tablet, ela desce ao lado da foto e o nicho cobre a altura toda.
 */
export function CartLineItem({ line, variant = 'drawer' }: { line: CartLine; variant?: 'drawer' | 'page' }) {
  const { setQuantity, remove, close } = useCart();
  const page = variant === 'page';
  const unavailable = line.status === 'indisponivel';
  const href = line.product && !unavailable ? productHref(line.product) : null;
  const team = line.product ? teamById(line.product.teamId)?.name : undefined;
  const thumb = <LineThumb line={line} size={page ? 'md' : 'sm'} className="h-full" />;
  // Linhas de baixo (aviso de estoque e faixa): largura toda, ou só a coluna do texto na página.
  const lowerRow = cn('[grid-column:1/3]', page && 'sm:[grid-column:2]');

  return (
    <li className="locker group relative grid grid-cols-[auto_minmax(0,1fr)] rounded-[var(--radius-card)] transition-[border-color] duration-200 focus-within:border-line-strong hover:border-line-strong">
      {/* Nicho: a luz do teto acende quando o armário está em uso */}
      <div className={cn('relative border-r border-line bg-[#0a0c10] [grid-column:1] [grid-row:1]', page && 'sm:[grid-row:1/4]')}>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[16%] top-0 z-10 h-[2px] bg-light opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100"
        />
        {href ? (
          <Link href={href} onClick={close} tabIndex={-1} aria-hidden className="block h-full">
            {thumb}
          </Link>
        ) : (
          thumb
        )}
      </div>

      <div className="flex min-w-0 flex-col [grid-column:2] [grid-row:1]">
        {/* Plaquinha: time e tamanho */}
        <div className={cn('flex items-center justify-between gap-3 border-b border-line', page ? 'h-9 px-4' : 'h-8 px-3')}>
          <span className="plate min-w-0 truncate text-[0.78rem] leading-[1.25] text-fg-2">{team}</span>
          <span className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-[0.7rem] text-muted">Tamanho</span>
            <span className="plate text-[0.86rem] leading-[1.25] text-fg">{line.size}</span>
          </span>
        </div>

        <div className={cn('flex flex-1 items-start justify-between gap-2', page ? 'py-3 pl-4 pr-2' : 'py-2.5 pl-3 pr-1.5')}>
          <div className="min-w-0 pt-0.5">
            {href ? (
              <Link
                href={href}
                onClick={close}
                className="line-clamp-2 text-sm font-semibold leading-snug text-fg decoration-fg/40 underline-offset-[3px] hover:underline sm:text-[0.95rem]"
              >
                {line.name}
              </Link>
            ) : (
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-fg-2 sm:text-[0.95rem]">{line.name}</p>
            )}
            <p className="mt-1 text-xs tabular-nums text-muted">{formatPrice(line.unitPrice)} cada</p>
          </div>
          <button
            type="button"
            onClick={() => remove(line.productId, line.size)}
            aria-label={`Remover ${line.name} tamanho ${line.size}`}
            className="-mt-1 grid size-10 shrink-0 place-items-center rounded-[var(--radius-button)] text-muted transition-[color,background-color,transform,scale] duration-150 ease-[var(--ease-out-fz)] hover:bg-danger/10 hover:text-danger active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>

      {line.status !== 'ok' && (
        <div
          role="alert"
          className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-3 py-2 text-xs [grid-row:2]',
            lowerRow,
            unavailable ? 'border-danger/25 bg-danger/[0.07] text-danger' : 'border-warn/25 bg-warn/[0.07] text-warn',
          )}
        >
          <AlertTriangle className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="min-w-0 flex-1">
            {unavailable ? STOCK_ISSUE_MESSAGE.indisponivel : `Restam ${line.available} ${line.available === 1 ? 'unidade' : 'unidades'} neste tamanho.`}
          </span>
          {unavailable ? (
            <button type="button" onClick={() => remove(line.productId, line.size)} className={cn(TEXT_ACTION, 'decoration-danger/40 hover:decoration-danger')}>
              Remover
            </button>
          ) : (
            <button type="button" onClick={() => setQuantity(line.productId, line.size, line.available)} className={cn(TEXT_ACTION, 'decoration-warn/40 hover:decoration-warn')}>
              Ajustar para {line.available}
            </button>
          )}
        </div>
      )}

      {/* Faixa: quantidade e subtotal da linha */}
      <div className={cn('flex items-center justify-between gap-3 border-t border-line [grid-row:3]', lowerRow, page ? 'px-4 py-2.5' : 'px-3 py-2')}>
        {unavailable ? (
          <span className="text-xs tabular-nums text-muted">Qtd.: {line.quantity}</span>
        ) : (
          <QuantityStepper
            size="sm"
            value={line.quantity}
            max={Math.max(1, line.maxQuantity)}
            onChange={(q) => setQuantity(line.productId, line.size, q)}
            label={`Quantidade de ${line.name}`}
          />
        )}
        <p className={cn('font-extrabold tabular-nums', page ? 'text-base sm:text-lg' : 'text-[0.95rem]', unavailable ? 'text-muted line-through' : 'text-fg')}>
          {formatPrice(line.subtotal)}
        </p>
      </div>
    </li>
  );
}

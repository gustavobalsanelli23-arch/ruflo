'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Lock, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartLine } from '@/lib/cart';
import { useCart } from '@/context/CartContext';
import { cn, formatPrice } from '@/lib/format';
import { productHref } from '@/lib/product';
import { STOCK_ISSUE_MESSAGE } from '@/services/inventory.service';
import { Button, LinkButton } from '@/components/ui/Button';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ProductImage } from '@/components/products/ProductImage';

/** Linha de produto do carrinho (drawer, página do carrinho e checkout). */
export function CartLineItem({ line, variant = 'drawer' }: { line: CartLine; variant?: 'drawer' | 'page' }) {
  const { setQuantity, remove, close } = useCart();
  const page = variant === 'page';
  const unavailable = line.status === 'indisponivel';
  const href = line.product && !unavailable ? productHref(line.product) : null;
  const imageClass = cn('rounded-xl', page ? 'h-32 w-24 sm:h-36 sm:w-28' : 'h-24 w-20', unavailable && 'opacity-50 grayscale');

  const image = line.product ? (
    <ProductImage product={line.product} className={imageClass} />
  ) : line.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={line.image} alt="" width={720} height={960} className={cn(imageClass, 'object-cover')} />
  ) : (
    <span className={cn(imageClass, 'block bg-surface-2')} />
  );

  return (
    <li className={cn('animate-fade-up flex gap-3 sm:gap-4', page ? 'py-5' : 'py-4')}>
      {href ? (
        <Link href={href} onClick={close} className="shrink-0 transition-opacity hover:opacity-85">
          {image}
        </Link>
      ) : (
        <span className="shrink-0">{image}</span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {href ? (
              <Link href={href} onClick={close} className="line-clamp-2 text-sm font-semibold transition-colors hover:text-brand-300 sm:text-base">
                {line.name}
              </Link>
            ) : (
              <p className="line-clamp-2 text-sm font-semibold text-fg-2 sm:text-base">{line.name}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              Tamanho <span className="font-bold text-fg">{line.size}</span>
              <span className="mx-1.5 text-subtle">·</span>
              {formatPrice(line.unitPrice)} un.
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove(line.productId, line.size)}
            className="rounded-full p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60"
            aria-label={`Remover ${line.name} tamanho ${line.size}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {line.status !== 'ok' && (
          <div role="alert" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs', unavailable ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn')}>
            <AlertTriangle className="size-3.5 shrink-0" />
            <span className="flex-1">{unavailable ? STOCK_ISSUE_MESSAGE.indisponivel : `Restam ${line.available} ${line.available === 1 ? 'unidade' : 'unidades'} neste tamanho.`}</span>
            {unavailable ? (
              <button type="button" onClick={() => remove(line.productId, line.size)} className="font-bold underline-offset-2 hover:underline">
                Remover
              </button>
            ) : (
              <button type="button" onClick={() => setQuantity(line.productId, line.size, line.available)} className="font-bold underline-offset-2 hover:underline">
                Ajustar para {line.available}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          {unavailable ? (
            <span className="text-xs text-muted">Qtd.: {line.quantity}</span>
          ) : (
            <QuantityStepper
              size="sm"
              value={line.quantity}
              max={Math.max(1, line.maxQuantity)}
              onChange={(q) => setQuantity(line.productId, line.size, q)}
              label={`Quantidade de ${line.name}`}
            />
          )}
          <div className="text-right">
            {page && <p className="text-[0.65rem] uppercase tracking-wider text-muted">Subtotal</p>}
            <p key={line.subtotal} className={cn('animate-pop font-extrabold tabular-nums', unavailable && 'text-muted line-through')}>
              {formatPrice(line.subtotal)}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartDrawer() {
  const { isOpen, close, lines, count, validCount, subtotal, issues, resolveIssues } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    close();
    // fecha ao navegar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="animate-fade absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label="Carrinho" className="animate-drawer absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-2xl sm:rounded-l-[1.75rem]">
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-baseline gap-3">
            <h2 className="heading-display text-3xl">Carrinho</h2>
            <span className="text-sm text-muted">
              {count} {count === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Fechar carrinho">
            <X className="size-5" />
          </Button>
        </header>

        {lines.length === 0 ? (
          <div className="animate-fade-up flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/25">
              <ShoppingBag className="size-7" />
            </span>
            <p className="heading-display text-3xl">Seu carrinho está vazio</p>
            <p className="max-w-xs text-sm text-muted">Escolha sua próxima camisa e ela aparecerá aqui.</p>
            <LinkButton href="/camisas" onClick={close}>
              Ver camisas
            </LinkButton>
          </div>
        ) : (
          <>
            {issues > 0 && (
              <div className="flex items-center gap-3 border-b border-white/[0.06] bg-warn/10 px-5 py-3 text-xs text-warn">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="flex-1">{issues === 1 ? 'Um item precisa de ajuste.' : `${issues} itens precisam de ajuste.`}</span>
                <button type="button" onClick={resolveIssues} className="font-bold hover:underline">
                  Resolver
                </button>
              </div>
            )}
            <ul className="flex-1 divide-y divide-white/[0.06] overflow-y-auto overscroll-contain px-5">
              {lines.map((line) => (
                <CartLineItem key={`${line.productId}-${line.size}`} line={line} />
              ))}
            </ul>
            <footer className="space-y-3 border-t border-white/[0.06] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              <dl className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-fg-2">
                  <dt>Produtos ({validCount})</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between text-fg-2">
                  <dt>Frete</dt>
                  <dd className="text-muted">Calculado no checkout</dd>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <dt className="font-bold text-fg">Subtotal</dt>
                  <dd key={subtotal} className="animate-pop text-2xl font-extrabold tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
              </dl>
              {issues > 0 || validCount === 0 ? (
                <Button block disabled>
                  <Lock className="size-4" /> Ajuste o carrinho para continuar
                </Button>
              ) : (
                <LinkButton href="/checkout" block onClick={close}>
                  <Lock className="size-4" /> Finalizar compra
                </LinkButton>
              )}
              <div className="grid grid-cols-2 gap-2">
                <LinkButton href="/carrinho" variant="secondary" onClick={close}>
                  Ver carrinho
                </LinkButton>
                <Button variant="ghost" onClick={close}>
                  Continuar
                </Button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

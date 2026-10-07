'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartLine } from '@/lib/cart';
import { useCart } from '@/context/CartContext';
import { cn, formatPrice } from '@/lib/format';
import { productHref } from '@/lib/product';
import { Button, LinkButton } from '@/components/ui/Button';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ProductImage } from '@/components/products/ProductImage';

/** Linha de produto do carrinho, reutilizada no drawer e na página /carrinho. */
export function CartLineItem({ line, variant = 'drawer' }: { line: CartLine; variant?: 'drawer' | 'page' }) {
  const { setQuantity, remove, close } = useCart();
  const href = productHref(line.product);
  const page = variant === 'page';

  return (
    <li className={cn('animate-fade-up flex gap-3 sm:gap-4', page ? 'py-5' : 'py-4')}>
      <Link href={href} onClick={close} className="shrink-0">
        <ProductImage product={line.product} className={cn('rounded-xl transition-opacity hover:opacity-85', page ? 'h-32 w-26 sm:h-36 sm:w-29' : 'h-24 w-20')} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} onClick={close} className="line-clamp-2 text-sm font-semibold transition-colors hover:text-brand-300 sm:text-base">
              {line.product.name}
            </Link>
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
            aria-label={`Remover ${line.product.name} tamanho ${line.size}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            max={line.maxQuantity}
            onChange={(q) => setQuantity(line.productId, line.size, q)}
            label={`Quantidade de ${line.product.name}`}
          />
          <div className="text-right">
            {page && <p className="text-[0.65rem] uppercase tracking-wider text-muted">Subtotal</p>}
            <p className="font-extrabold tabular-nums">{formatPrice(line.subtotal)}</p>
          </div>
        </div>
        {line.quantity >= line.maxQuantity && <p className="text-[0.7rem] text-warn">Quantidade máxima disponível para este tamanho.</p>}
      </div>
    </li>
  );
}

export function CartDrawer() {
  const { isOpen, close, lines, count, subtotal } = useCart();
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
            <ul className="flex-1 divide-y divide-white/[0.06] overflow-y-auto overscroll-contain px-5">
              {lines.map((line) => (
                <CartLineItem key={`${line.productId}-${line.size}`} line={line} />
              ))}
            </ul>
            <footer className="space-y-3 border-t border-white/[0.06] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              <dl className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-fg-2">
                  <dt>Produtos ({count})</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between text-fg-2">
                  <dt>Frete</dt>
                  <dd className="text-muted">Calculado depois</dd>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <dt className="font-bold text-fg">Subtotal</dt>
                  <dd className="text-2xl font-extrabold tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted">Frete e finalização da compra serão adicionados em uma próxima etapa.</p>
              <LinkButton href="/carrinho" block onClick={close}>
                Ver carrinho completo
              </LinkButton>
              <Button variant="ghost" block onClick={close}>
                Continuar comprando
              </Button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

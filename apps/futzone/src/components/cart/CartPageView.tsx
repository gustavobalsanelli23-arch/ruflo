'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Shirt, Trash2 } from 'lucide-react';
import type { Product } from '@/types/catalog';
import { useCart } from '@/context/CartContext';
import { useStoreData } from '@/context/StoreDataContext';
import { formatPrice } from '@/lib/format';
import { toShippingItems } from '@/lib/checkout';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShippingEstimator } from '@/components/checkout/ShippingEstimator';
import { TrustBadges } from '@/components/checkout/TrustBadges';
import { RecentlyViewed, RecommendedProducts } from '@/components/products/ProductSections';
import { CartLineItem } from './CartLine';

/*
 * O resumo gruda logo abaixo do Header rolado (58px = h-14 + 2 bordas,
 * components/layout/Header.tsx) com um respiro de 1.5rem.
 */
const SUMMARY_STICKY = 'lg:sticky lg:top-[calc(58px+1.5rem)] lg:self-start';

function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <div className="space-y-3">
        <Skeleton className="mb-4 h-4 w-36 rounded-sm" />
        {[0, 1].map((i) => (
          <div key={i} className="locker flex rounded-[var(--radius-card)]" aria-hidden>
            <Skeleton className="aspect-[3/4] w-24 shrink-0 rounded-none sm:w-28" />
            <div className="flex-1 space-y-3 p-4">
              <Skeleton className="h-3 w-1/3 rounded-sm" />
              <Skeleton className="h-4 w-3/4 rounded-sm" />
              <Skeleton className="h-3 w-1/4 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
      <div className="locker h-80 rounded-[var(--radius-card)]" aria-hidden />
    </div>
  );
}

export function CartPageView() {
  const router = useRouter();
  const { lines, validCount, subtotal, savings, issues, clear, resolveIssues } = useCart();
  const { hydrated } = useStoreData();
  const references = useMemo(() => lines.map((l) => l.product).filter((p): p is Product => !!p), [lines]);

  if (!hydrated) return <CartSkeleton />;

  if (lines.length === 0) {
    return (
      <>
        <EmptyState
          headingLevel="h2"
          icon={<Shirt className="size-6" strokeWidth={1.75} aria-hidden />}
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione as camisas que você quer vestir."
          action={<LinkButton href="/camisas">Ver camisas</LinkButton>}
        />
        <RecentlyViewed />
      </>
    );
  }

  const blocked = issues > 0 || validCount === 0;

  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        <section aria-label="Produtos no carrinho" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-sm text-muted">
              <span className="font-bold tabular-nums text-fg">{validCount}</span> {validCount === 1 ? 'item disponível' : 'itens disponíveis'}
            </p>
            <Button variant="ghost" size="sm" onClick={clear} className="-mr-2">
              <Trash2 className="size-4" strokeWidth={1.75} aria-hidden /> Esvaziar
            </Button>
          </div>

          {issues > 0 && (
            <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-warn/30 bg-warn/[0.06] px-4 py-3 text-sm text-warn">
              <AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="min-w-0 flex-1">Alguns produtos ficaram indisponíveis ou com estoque menor. Ajuste o carrinho para continuar.</span>
              <Button size="sm" variant="secondary" onClick={resolveIssues}>
                Ajustar automaticamente
              </Button>
            </div>
          )}

          <ul className="space-y-3">
            {lines.map((line) => (
              <CartLineItem key={`${line.productId}-${line.size}`} line={line} variant="page" />
            ))}
          </ul>

          <LinkButton href="/camisas" variant="ghost" className="-ml-3 mt-5">
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden /> Continuar comprando
          </LinkButton>
        </section>

        <aside aria-labelledby="carrinho-resumo" className={SUMMARY_STICKY}>
          {/* Armário do resumo: aceso, porque guarda a ação principal da página */}
          <div className="locker relative rounded-[var(--radius-card)]">
            <span aria-hidden className="pointer-events-none absolute inset-x-[14%] top-0 h-px bg-light/60" />
            <div className="flex h-11 items-center border-b border-line px-5">
              <h2 id="carrinho-resumo" className="plate text-[1.05rem] leading-[1.25] text-fg">
                Resumo
              </h2>
            </div>
            <div className="space-y-5 p-5">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-2">Produtos ({validCount})</dt>
                  <dd className="tabular-nums text-fg-2">{formatPrice(subtotal + savings)}</dd>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-fg-2">Promoções</dt>
                    <dd className="tabular-nums text-success">− {formatPrice(savings)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-semibold text-fg">Subtotal</dt>
                  <dd className="text-2xl font-extrabold tabular-nums text-fg">{formatPrice(subtotal)}</dd>
                </div>
              </dl>

              <Button block size="lg" disabled={blocked} onClick={() => router.push('/checkout')}>
                {blocked ? 'Ajuste o carrinho' : 'Continuar para o checkout'}
              </Button>

              <div className="border-t border-line pt-5">
                <h3 className="mb-2.5 text-sm font-semibold text-fg">Calcular frete</h3>
                <ShippingEstimator items={toShippingItems(lines)} subtotal={subtotal} />
              </div>

              <TrustBadges compact className="border-t border-line pt-4" />
            </div>
          </div>
        </aside>
      </div>
      <RecommendedProducts references={references} />
      <RecentlyViewed />
    </>
  );
}

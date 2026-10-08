'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Lock, ShoppingBag, Trash2 } from 'lucide-react';
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
import { CartLineItem } from './CartDrawer';

export function CartPageView() {
  const router = useRouter();
  const { lines, validCount, subtotal, savings, issues, clear, resolveIssues } = useCart();
  const { hydrated } = useStoreData();
  const references = useMemo(() => lines.map((l) => l.product).filter((p): p is Product => !!p), [lines]);

  if (!hydrated)
    return (
      <div role="status" aria-label="Carregando carrinho" className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
        <div className="space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-36 w-28" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );

  if (lines.length === 0) {
    return (
      <>
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
        <section aria-label="Produtos no carrinho" className="min-w-0">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <p className="text-sm text-muted">
              <span className="font-bold text-fg">{validCount}</span> {validCount === 1 ? 'item disponível' : 'itens disponíveis'}
            </p>
            <Button variant="ghost" size="sm" onClick={clear}>
              <Trash2 className="size-4" /> Esvaziar
            </Button>
          </div>
          {issues > 0 && (
            <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="flex-1">Alguns produtos ficaram indisponíveis ou com estoque menor. Ajuste o carrinho para continuar.</span>
              <Button size="sm" variant="secondary" onClick={resolveIssues}>Ajustar automaticamente</Button>
            </div>
          )}
          <ul className="divide-y divide-white/[0.06]">
            {lines.map((line) => (
              <CartLineItem key={`${line.productId}-${line.size}`} line={line} variant="page" />
            ))}
          </ul>
          <LinkButton href="/camisas" variant="ghost" className="mt-4">
            <ArrowLeft className="size-4" /> Continuar comprando
          </LinkButton>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="animate-fade-up space-y-5 rounded-3xl bg-surface p-6 ring-1 ring-white/[0.06]">
            <h2 className="heading-display text-3xl">Resumo</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-2">Produtos ({validCount})</dt>
                <dd className="tabular-nums">{formatPrice(subtotal + savings)}</dd>
              </div>
              {savings > 0 && (
                <div className="flex justify-between">
                  <dt className="text-fg-2">Promoções</dt>
                  <dd className="tabular-nums text-success">− {formatPrice(savings)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-4">
                <dt className="font-bold">Subtotal</dt>
                <dd key={subtotal} className="animate-pop text-2xl font-extrabold tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-2">Calcular frete</p>
              <ShippingEstimator items={toShippingItems(lines)} subtotal={subtotal} />
            </div>
            <Button block size="lg" disabled={blocked} onClick={() => router.push('/checkout')}>
              <Lock className="size-4" /> {blocked ? 'Ajuste o carrinho' : 'Continuar para o checkout'}
            </Button>
            <TrustBadges compact className="border-t border-white/[0.06] pt-5" />
          </div>
        </aside>
      </div>
      <RecommendedProducts references={references} />
      <RecentlyViewed />
    </>
  );
}

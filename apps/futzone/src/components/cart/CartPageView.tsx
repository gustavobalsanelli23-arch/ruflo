'use client';

import { ArrowLeft, Info, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useStoreData } from '@/context/StoreDataContext';
import { formatPrice } from '@/lib/format';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Skeleton } from '@/components/ui/Skeleton';
import { CartLineItem } from './CartDrawer';

export function CartPageView() {
  const { lines, count, subtotal, savings, clear } = useCart();
  const { hydrated } = useStoreData();

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
      <EmptyState
        icon={<ShoppingBag className="size-6" />}
        title="Seu carrinho está vazio"
        description="Explore o catálogo e adicione as camisas que você quer vestir."
        action={<LinkButton href="/camisas">Ver camisas</LinkButton>}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <section aria-label="Produtos no carrinho" className="min-w-0">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <p className="text-sm text-muted">
            <span className="font-bold text-fg">{count}</span> {count === 1 ? 'item' : 'itens'}
          </p>
          <Button variant="ghost" size="sm" onClick={clear}>
            <Trash2 className="size-4" /> Esvaziar
          </Button>
        </div>
        <ul className="divide-y divide-white/[0.06]">
          {lines.map((line) => (
            <CartLineItem key={`${line.productId}-${line.size}`} line={line} variant="page" />
          ))}
        </ul>
        <LinkButton href="/camisas" variant="ghost" className="mt-4">
          <ArrowLeft className="size-4" /> Voltar ao catálogo
        </LinkButton>
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="animate-fade-up rounded-3xl bg-surface p-6">
          <h2 className="heading-display mb-6 text-3xl">Resumo</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-2">Produtos ({count})</dt>
              <dd className="tabular-nums">{formatPrice(subtotal + savings)}</dd>
            </div>
            {savings > 0 && (
              <div className="flex justify-between">
                <dt className="text-fg-2">Descontos</dt>
                <dd className="tabular-nums text-brand-300">− {formatPrice(savings)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-fg-2">Frete</dt>
              <dd className="text-muted">Calculado na próxima etapa</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-white/[0.06] pt-4">
              <dt className="font-bold">Total dos produtos</dt>
              <dd className="text-2xl font-extrabold tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
          </dl>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand-500/25 bg-brand-500/[0.07] p-3 text-xs text-fg-2">
            <Info className="mt-0.5 size-4 shrink-0 text-brand-400" />
            A finalização do pedido (checkout, frete e pagamento) será disponibilizada em uma próxima etapa. Seu carrinho fica salvo neste navegador.
          </div>
          <LinkButton href="/camisas" block variant="outline" className="mt-5">
            Continuar comprando
          </LinkButton>
        </div>
      </aside>
    </div>
  );
}

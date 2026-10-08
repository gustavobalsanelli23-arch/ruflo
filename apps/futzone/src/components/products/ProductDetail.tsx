'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, PackageCheck, Ruler, ShieldCheck, ShoppingBag, Shirt } from 'lucide-react';
import type { Size } from '@/types/catalog';
import { categoryById } from '@/data/categories';
import { useStoreData, usePublicProducts } from '@/context/StoreDataContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { cn, formatPrice } from '@/lib/format';
import { availableSizes, stockFor, teamById, teamBySlug } from '@/lib/product';
import { MAX_PER_ITEM } from '@/lib/cart';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ProductGallery } from './ProductGallery';
import { ProductPageSkeleton } from '@/components/ui/Skeleton';
import { Price, SizeSelector, StockBadge, StockText } from './ProductBits';
import { SizeGuide } from './SizeGuide';
import { FavoriteButton } from './FavoriteButton';
import { RecentlyViewed, RecommendedProducts, useRecordView } from './ProductSections';

export function ProductDetail({ teamSlug, slug }: { teamSlug: string; slug: string }) {
  const { hydrated } = useStoreData();
  const products = usePublicProducts();
  const { add, open } = useCart();
  const { notify } = useToast();
  const [size, setSize] = useState<Size | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [addState, setAddState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [showBar, setShowBar] = useState(false);
  const [buyEl, setBuyEl] = useState<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Barra fixa de compra no celular quando o botão principal sai da tela.
  useEffect(() => {
    if (!buyEl) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setShowBar(buyEl.getBoundingClientRect().bottom < 0));
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', check);
    };
  }, [buyEl]);

  const team = teamBySlug(teamSlug);
  const product = products.find((p) => p.slug === slug && p.teamId === team?.id);
  useRecordView(product?.id);

  if (!product) {
    if (!hydrated) return <ProductPageSkeleton />;
    return (
      <EmptyState
        icon={<Shirt className="size-6" />}
        title="Produto não encontrado"
        description="Esta camisa pode ter sido removida ou não está mais disponível."
        action={<LinkButton href="/camisas">Ver catálogo</LinkButton>}
      />
    );
  }

  const category = categoryById(product.category);
  const maxQty = size ? Math.min(stockFor(product, size), MAX_PER_ITEM) : MAX_PER_ITEM;
  const soldOut = availableSizes(product).length === 0;


  const handleAdd = () => {
    if (addState !== 'idle') return;
    if (!size) {
      setSizeError(false);
      requestAnimationFrame(() => setSizeError(true));
      notify('Selecione um tamanho.', 'info');
      buyEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // Pequena animação de carregamento → confirmação, sem atrasar a navegação.
    setAddState('loading');
    timers.current.push(
      window.setTimeout(() => {
        const added = add(product.id, size, qty);
        if (added === 0) {
          setAddState('idle');
          notify('Você já tem a quantidade máxima disponível no carrinho.', 'warning');
          return;
        }
        notify(added < qty ? `Adicionamos ${added} (limite de estoque).` : `${product.name} (${size}) adicionada ao carrinho.`);
        setQty(1);
        setAddState('done');
        timers.current.push(window.setTimeout(open, 350), window.setTimeout(() => setAddState('idle'), 1600));
      }, 280),
    );
  };

  const addLabel = soldOut ? 'Esgotado' : addState === 'done' ? 'Adicionado' : 'Adicionar ao carrinho';
  const addIcon = addState === 'done' ? <Check className="animate-pop size-5" /> : <ShoppingBag className="size-5" />;

  return (
    <>
      <nav aria-label="Trilha" className="mb-6">
        <ol className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          <li><Link href="/" className="transition-colors hover:text-fg">Início</Link></li>
          <li aria-hidden><ChevronRight className="size-3" /></li>
          <li><Link href="/camisas" className="transition-colors hover:text-fg">Camisas</Link></li>
          <li aria-hidden><ChevronRight className="size-3" /></li>
          <li className="shrink-0"><Link href={`/camisas/${team?.slug}`} className="transition-colors hover:text-fg">{team?.name}</Link></li>
          <li aria-hidden className="hidden sm:block"><ChevronRight className="size-3" /></li>
          <li className="hidden min-w-0 truncate text-fg-2 sm:block" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <ProductGallery product={product} />

        <div className="animate-fade-up flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link href={`/camisas/${team?.slug}`} className="eyebrow hover:text-brand-300">{team?.name}</Link>
              <span className="text-subtle">·</span>
              <span className="text-xs uppercase tracking-wider text-muted">{category?.shortName}{product.season && ` · Temporada ${product.season}`}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="heading-display text-[2.6rem] text-fg sm:text-5xl lg:text-6xl">{product.name}</h1>
              <FavoriteButton productId={product.id} productName={product.name} className="mt-1 size-11 shrink-0 rounded-full bg-white/[0.06] text-fg-2 hover:bg-white/[0.12] hover:text-fg" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Price product={product} size="lg" />
            <StockBadge product={product} />
          </div>

          <p className="leading-relaxed text-fg-2">{product.description}</p>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">
                Tamanho {size && <span className="text-brand-300">· {size}</span>}
              </p>
              <button type="button" onClick={() => setGuideOpen(true)} className="link-underline inline-flex items-center gap-1.5 text-xs font-semibold text-fg-2 hover:text-fg">
                <Ruler className="size-3.5" /> Tabela de tamanhos
              </button>
            </div>
            <SizeSelector
              product={product}
              value={size}
              invalid={sizeError}
              onChange={(s) => {
                setSize(s);
                setSizeError(false);
                setQty((q) => Math.min(q, Math.min(stockFor(product, s), MAX_PER_ITEM)));
              }}
            />
            <div className={cn('mt-3 min-h-5 text-sm', sizeError && 'text-danger')}>
              {sizeError ? 'Escolha um tamanho para continuar.' : size ? <StockText product={product} size={size} /> : <span className="text-xs text-muted">Selecione um tamanho para ver a disponibilidade.</span>}
            </div>
          </div>

          <div ref={setBuyEl} className="flex flex-col gap-3 sm:flex-row">
            <QuantityStepper value={qty} max={Math.max(1, maxQty)} onChange={setQty} />
            <Button
              size="lg"
              className={cn('flex-1', addState === 'done' && 'bg-success hover:bg-success')}
              disabled={soldOut}
              loading={addState === 'loading'}
              onClick={handleAdd}
              aria-live="polite"
            >
              {addState !== 'loading' && addIcon}
              {addLabel}
            </Button>
          </div>

          <ul className="grid gap-3 rounded-2xl bg-surface p-4 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-3 text-fg-2"><PackageCheck className="size-5 shrink-0 text-brand-400" /> Produto conferido antes do envio</li>
            <li className="flex items-center gap-3 text-fg-2"><ShieldCheck className="size-5 shrink-0 text-brand-400" /> Troca facilitada em até 7 dias</li>
          </ul>

          <details className="group rounded-2xl bg-surface" open>
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold">
              Detalhes do produto
              <ChevronRight className="size-4 text-muted transition-transform group-open:rotate-90" />
            </summary>
            <ul className="space-y-2 px-5 pb-5 text-sm text-fg-2">
              {product.details.map((d) => (
                <li key={d} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{d}</li>
              ))}
              <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />Tamanhos: {product.sizes.join(', ')}</li>
            </ul>
          </details>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="heading-display mb-5 text-3xl">Tabela de tamanhos</h2>
        <SizeGuide kids={product.gender === 'infantil'} />
      </section>

      <RecommendedProducts references={[product]} />
      <RecentlyViewed excludeId={product.id} />

      {/* Barra fixa de compra (celular) */}
      {!soldOut && (
        <div
          className={cn(
            'glass fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 ease-[var(--ease-out-fz)] lg:hidden',
            showBar ? 'translate-y-0' : 'pointer-events-none translate-y-full',
          )}
          aria-hidden={!showBar}
          inert={!showBar}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">{size ? `Tamanho ${size}` : 'Escolha um tamanho'}</p>
              <p className="font-extrabold tabular-nums text-fg">{formatPrice(product.price)}</p>
            </div>
            <Button className={cn('shrink-0', addState === 'done' && 'bg-success hover:bg-success')} loading={addState === 'loading'} onClick={handleAdd}>
              {addState !== 'loading' && addIcon}
              {addState === 'done' ? 'Adicionado' : 'Adicionar'}
            </Button>
          </div>
        </div>
      )}

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Tabela de tamanhos" description={teamById(product.teamId)?.name} size="lg">
        <SizeGuide kids={product.gender === 'infantil'} />
      </Modal>
    </>
  );
}

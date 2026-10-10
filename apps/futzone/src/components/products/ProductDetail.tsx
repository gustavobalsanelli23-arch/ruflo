'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronRight, PackageCheck, RefreshCcw, Ruler, Shirt, ShoppingBag } from 'lucide-react';
import type { Size } from '@/types/catalog';
import type { ShippingItem } from '@/services/shipping/shipping.types';
import { categoryById } from '@/data/categories';
import { useStoreData, usePublicProducts } from '@/context/StoreDataContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { cn, formatPrice } from '@/lib/format';
import { availableSizes, stockFor, teamBySlug } from '@/lib/product';
import { MAX_PER_ITEM } from '@/lib/cart';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { ProductPageSkeleton } from '@/components/ui/Skeleton';
import { ShippingEstimator } from '@/components/checkout/ShippingEstimator';
import { ProductGallery } from './ProductGallery';
import { Price, SizeSelector, StockText } from './ProductBits';
import { SizeGuide } from './SizeGuide';
import { FavoriteButton } from './FavoriteButton';
import { RecentlyViewed, RecommendedProducts, useRecordView } from './ProductSections';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "Time: Grêmio" vira chave e valor; o texto inteiro continua o mesmo. */
function splitDetail(text: string) {
  const at = text.indexOf(':');
  return at > 0 ? { text, key: text.slice(0, at + 1), value: text.slice(at + 1).trim() } : { text, key: '', value: text };
}

/**
 * Barra fixa de compra (celular): aparece quando o bloco de compra sai da tela
 * por cima e some antes do fim da página, sem nunca cobrir o rodapé. Dois
 * IntersectionObservers, nenhum ouvinte de scroll. A raiz de cada um é "tudo
 * acima de uma linha de corte": até um salto de rolagem (voltar à página,
 * tecla End) cruza o limite e atualiza a barra.
 */
const ABOVE = '100000px 0px';

function useBuyBar(buyEl: HTMLElement | null, endEl: HTMLElement | null) {
  const [pastBuy, setPastBuy] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  useEffect(() => {
    if (!buyEl || !('IntersectionObserver' in window)) return;
    // Linha de corte = topo da tela: o bloco passou quando está inteiro acima dela.
    const observer = new IntersectionObserver(([entry]) => setPastBuy(entry.intersectionRatio > 0.99), { rootMargin: `${ABOVE} -100% 0px`, threshold: 1 });
    observer.observe(buyEl);
    return () => observer.disconnect();
  }, [buyEl]);
  useEffect(() => {
    if (!endEl || !('IntersectionObserver' in window)) return;
    // O marcador fica ~120px acima do rodapé (respiro da página + margem do rodapé). Com a linha
    // de corte 96px acima do pé da tela, a barra recolhe com o rodapé ainda abaixo da dobra.
    const observer = new IntersectionObserver(([entry]) => setAtEnd(entry.isIntersecting), { rootMargin: `${ABOVE} -96px 0px` });
    observer.observe(endEl);
    return () => observer.disconnect();
  }, [endEl]);
  return pastBuy && !atEnd;
}

/** O rótulo troca para "Adicionado" num crossfade curto: opacidade e 2px de desfoque (sai em 150ms, entra em 200ms). */
function AddLabel({ done, children }: { done: boolean; children: string }) {
  const layer =
    'col-start-1 row-start-1 inline-flex items-center justify-center gap-2.5 transition-[opacity,filter] ease-[var(--ease-out-fz)] motion-reduce:filter-none';
  const shown = 'opacity-100 blur-[0px] duration-200';
  const hidden = 'opacity-0 blur-[2px] duration-150';
  return (
    <span className="grid">
      <span aria-hidden={done || undefined} className={cn(layer, done ? hidden : shown)}>
        <ShoppingBag className="size-5" strokeWidth={1.75} />
        {children}
      </span>
      <span aria-hidden={!done || undefined} className={cn(layer, done ? shown : hidden)}>
        <Check className="size-5" strokeWidth={1.75} />
        Adicionado
      </span>
    </span>
  );
}

/**
 * Página do produto: a camisa tirada do armário. Galeria acesa à esquerda
 * (fica à vista enquanto se escolhe), e à direita a plaquinha do time, o nome,
 * o preço, a grade de tamanhos, a compra, o frete simulado e os detalhes.
 */
export function ProductDetail({ teamSlug, slug }: { teamSlug: string; slug: string }) {
  const { hydrated } = useStoreData();
  const products = usePublicProducts();
  const { add, open } = useCart();
  const { notify } = useToast();
  const [size, setSize] = useState<Size | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [shake, setShake] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [added, setAdded] = useState(false);
  const [buyEl, setBuyEl] = useState<HTMLDivElement | null>(null);
  const [endEl, setEndEl] = useState<HTMLDivElement | null>(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const uid = useId();
  const showBar = useBuyBar(buyEl, endEl);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const team = teamBySlug(teamSlug);
  const product = products.find((p) => p.slug === slug && p.teamId === team?.id);
  const references = useMemo(() => (product ? [product] : []), [product]);
  useRecordView(product?.id);

  if (!product || !team) {
    if (!hydrated) return <ProductPageSkeleton />;
    return (
      <EmptyState
        headingLevel="h2"
        icon={<Shirt className="size-6" strokeWidth={1.75} />}
        title="Produto não encontrado"
        description="Esta camisa pode ter sido removida ou não está mais disponível."
        action={<LinkButton href="/camisas">Ver catálogo</LinkButton>}
      />
    );
  }

  const plateRight = product.season || categoryById(product.category)?.shortName || '';
  const maxQty = size ? Math.min(stockFor(product, size), MAX_PER_ITEM) : MAX_PER_ITEM;
  const soldOut = availableSizes(product).length === 0;
  const shippingItems: ShippingItem[] = [{ productId: product.id, category: product.category, quantity: qty, unitPrice: product.price }];
  const detailRows = [...product.details, `Tamanhos: ${product.sizes.join(', ')}`].map(splitDetail);

  const pickSize = (s: Size) => {
    setSize(s);
    setSizeError(false);
    setQty((q) => Math.min(q, Math.min(stockFor(product, s), MAX_PER_ITEM)));
  };

  const handleAdd = () => {
    if (added) return;
    if (!size) {
      // A grade sacode de novo a cada tentativa; a tela vai até ela e o foco cai no primeiro tamanho.
      setSizeError(true);
      setShake((n) => n + 1);
      notify('Selecione um tamanho.', 'info');
      const block = sizesRef.current;
      if (block) {
        const r = block.getBoundingClientRect();
        if (r.top < 72 || r.bottom > window.innerHeight - 88) block.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
        block.querySelector<HTMLButtonElement>('[role=radio]:not(:disabled)')?.focus({ preventScroll: true });
      }
      return;
    }
    const got = add(product.id, size, qty);
    if (got === 0) {
      notify('Você já tem a quantidade máxima disponível no carrinho.', 'warning');
      return;
    }
    notify(got < qty ? `Adicionamos ${got} (limite de estoque).` : `${product.name} (${size}) adicionada ao carrinho.`);
    setQty(1);
    setAdded(true);
    timers.current.push(window.setTimeout(open, 350), window.setTimeout(() => setAdded(false), 1600));
  };

  const shipId = `${uid}-frete`;
  const detailsId = `${uid}-detalhes`;

  return (
    <>
      <nav aria-label="Trilha" className="mb-6">
        <ol className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          <li><Link href="/" className="transition-colors hover:text-fg">Início</Link></li>
          <li aria-hidden><ChevronRight className="size-3" strokeWidth={1.75} /></li>
          <li><Link href="/camisas" className="transition-colors hover:text-fg">Camisas</Link></li>
          <li aria-hidden><ChevronRight className="size-3" strokeWidth={1.75} /></li>
          <li className="shrink-0"><Link href={`/camisas/${team.slug}`} className="transition-colors hover:text-fg">{team.name}</Link></li>
          <li aria-hidden className="hidden sm:block"><ChevronRight className="size-3" strokeWidth={1.75} /></li>
          <li className="hidden min-w-0 truncate text-fg-2 sm:block" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        {/* A galeria acompanha a leitura (só quando cabe inteira na altura da tela) */}
        <div className="min-w-0 md:top-[5.125rem] md:self-start md:[@media(min-height:36rem)]:sticky">
          <ProductGallery product={product} />
        </div>

        <div className="@container flex min-w-0 flex-col">
          {/* Plaquinha do armário: time (leva à página dele) e temporada */}
          <div className="flex h-10 items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-steel-2 px-3">
            <Link href={`/camisas/${team.slug}`} className="plate min-w-0 truncate text-[0.95rem] leading-[1.25] text-fg underline-offset-4 hover:underline">
              {team.name}
            </Link>
            {plateRight && <span className="plate shrink-0 text-[0.85rem] leading-[1.25] tabular-nums text-muted">{plateRight}</span>}
          </div>

          <div className="mt-6 flex items-start justify-between gap-4">
            <h1 className="heading-display min-w-0 text-[2.25rem] text-fg sm:text-5xl md:text-[2.5rem] lg:text-[3.25rem] xl:text-[3.5rem]">{product.name}</h1>
            <FavoriteButton
              productId={product.id}
              productName={product.name}
              className="size-11 shrink-0 rounded-[var(--radius-button)] border border-line-strong bg-steel-2 text-fg-2 hover:border-fg-2/60 hover:text-fg"
            />
          </div>
          <div className="mt-4">
            <Price product={product} size="lg" />
          </div>
          <p className="mt-5 max-w-[65ch] leading-relaxed text-fg-2">{product.description}</p>

          {/* Compra: tamanho, quantidade e o botão principal */}
          <div className="mt-8 border-t border-line pt-6">
            <div ref={sizesRef}>
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-fg-2">
                  Tamanho{size && <> <span className="font-bold tabular-nums text-fg">{size}</span></>}
                </p>
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="-my-2 inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-fg-2 underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-fg hover:decoration-fg-2"
                >
                  <Ruler className="size-4" strokeWidth={1.75} /> Tabela de tamanhos
                </button>
              </div>
              <SizeSelector product={product} value={size} invalid={sizeError} shakeSignal={shake} onChange={pickSize} />
              <div className="mt-3 min-h-6">
                {sizeError ? (
                  <p role="alert" className="text-sm text-danger">Escolha um tamanho para continuar.</p>
                ) : size || soldOut ? (
                  <StockText product={product} size={size ?? undefined} />
                ) : (
                  <p className="text-sm text-muted">Selecione um tamanho para ver a disponibilidade.</p>
                )}
              </div>
            </div>

            <div ref={setBuyEl} className="mt-5 flex flex-col gap-3 @md:flex-row">
              {!soldOut && (
                <div className="flex items-center justify-between gap-4 @md:items-stretch">
                  <span aria-hidden className="text-sm font-semibold text-fg-2 @md:hidden">Quantidade</span>
                  <QuantityStepper value={qty} max={Math.max(1, maxQty)} onChange={setQty} />
                </div>
              )}
              <Button size="lg" className="w-full @md:w-auto @md:flex-1" disabled={soldOut} onClick={handleAdd} aria-live="polite">
                {soldOut ? 'Esgotado' : <AddLabel done={added}>Adicionar ao carrinho</AddLabel>}
              </Button>
            </div>

            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] text-muted">
              <li className="inline-flex items-center gap-2">
                <PackageCheck className="size-4 shrink-0 text-fg-2" strokeWidth={1.75} />
                Produto conferido antes do envio
              </li>
              <li className="inline-flex items-center gap-2">
                <RefreshCcw className="size-4 shrink-0 text-fg-2" strokeWidth={1.75} />
                <Link href="/politicas#trocas" className="underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-fg hover:decoration-fg-2">
                  Troca facilitada em até 7 dias
                </Link>
              </li>
            </ul>
          </div>

          {!soldOut && (
            <section aria-labelledby={shipId} className="mt-8 border-t border-line pt-6">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h2 id={shipId} className="text-sm font-bold text-fg">Frete e prazo</h2>
                <span className="text-xs text-muted">Simulado</span>
              </div>
              <ShippingEstimator items={shippingItems} subtotal={product.price * qty} />
            </section>
          )}

          <section className="mt-8 border-t border-line">
            <h2>
              <button
                type="button"
                id={`${detailsId}-botao`}
                aria-expanded={detailsOpen}
                aria-controls={detailsId}
                onClick={() => setDetailsOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold text-fg"
              >
                Detalhes do produto
                <ChevronDown
                  className={cn('size-4 shrink-0 text-muted transition-[rotate] duration-200 ease-[var(--ease-out-fz)] motion-reduce:transition-none', detailsOpen && 'rotate-180')}
                  strokeWidth={1.75}
                />
              </button>
            </h2>
            {/* Abre e fecha animando a altura real (grid-template-rows 0fr → 1fr) */}
            <div
              id={detailsId}
              role="region"
              aria-labelledby={`${detailsId}-botao`}
              inert={!detailsOpen}
              className={cn(
                'grid transition-[grid-template-rows,opacity] ease-[var(--ease-in-out-fz)] motion-reduce:transition-[opacity]',
                detailsOpen ? 'grid-rows-[1fr] opacity-100 duration-[250ms]' : 'grid-rows-[0fr] opacity-0 duration-200',
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <ul className="divide-y divide-line border-t border-line text-sm">
                  {detailRows.map((d) => (
                    <li key={d.text} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-3">
                      {d.key ? (
                        <>
                          <span className="text-muted">{d.key}</span> <span className="text-fg-2">{d.value}</span>
                        </>
                      ) : (
                        <span className="col-span-2 text-fg-2">{d.value}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>

      <RecommendedProducts references={references} />
      <RecentlyViewed excludeId={product.id} />
      {/* Fim do conteúdo da página: daqui em diante a barra fixa se recolhe */}
      <div ref={setEndEl} aria-hidden className="h-px" />

      {!soldOut && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-steel px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[translate,opacity] lg:hidden',
            showBar
              ? 'translate-y-0 opacity-100 duration-300 ease-[var(--ease-drawer)]'
              : 'pointer-events-none translate-y-full opacity-0 duration-200 ease-[var(--ease-out-fz)] motion-reduce:translate-y-0',
          )}
          aria-hidden={!showBar}
          inert={!showBar}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">{size ? `Tamanho ${size}` : 'Escolha um tamanho'}</p>
              <p className="font-extrabold tabular-nums text-fg">{formatPrice(product.price)}</p>
            </div>
            <Button className="shrink-0" onClick={handleAdd}>
              <AddLabel done={added}>Adicionar</AddLabel>
            </Button>
          </div>
        </div>
      )}

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Tabela de tamanhos" description={team.name} size="lg">
        <SizeGuide kids={product.gender === 'infantil'} highlight={size} />
      </Modal>
    </>
  );
}

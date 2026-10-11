'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Shirt, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { cn, formatPrice } from '@/lib/format';
import { Button, LinkButton } from '@/components/ui/Button';
import { CartLineItem } from './CartLine';

// A linha do carrinho mora em CartLine.tsx; o reexport mantém o import antigo funcionando.
export { CartLineItem } from './CartLine';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Gaveta do carrinho: painel de aço que entra pela direita (320ms) e sai mais
 * rápido (200ms) antes de desmontar. Fecha com Esc, clique no fundo e troca de
 * rota; trava a rolagem da página, prende o foco enquanto aberta e devolve o
 * foco a quem abriu quando o fechamento parte de dentro dela.
 */
export function CartDrawer() {
  const { isOpen, close, lines, count, validCount, subtotal, issues, resolveIssues } = useCart();
  const pathname = usePathname();
  const [present, setPresent] = useState(isOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  /** Quem abriu a gaveta (botão do cabeçalho, "Adicionar ao carrinho"...). */
  const returnTo = useRef<HTMLElement | null>(null);
  /** Só devolve o foco quando o fechamento parte da gaveta (não ao seguir um link). */
  const restoreFocus = useRef(false);
  const closeRef = useRef(close);
  closeRef.current = close;

  // Abrir monta na mesma renderização (sem quadro vazio).
  if (isOpen && !present) setPresent(true);

  // Fecha ao trocar de página.
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const dismiss = useCallback(() => {
    restoreFocus.current = true;
    close();
  }, [close]);

  // Aberta: guarda quem abriu, trava a rolagem (sem pulo da barra), foca o fechar e escuta o Esc.
  useEffect(() => {
    if (!isOpen) return;
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    restoreFocus.current = false;

    const body = document.body;
    const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    closeButtonRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      restoreFocus.current = true;
      closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
    };
  }, [isOpen]);

  // Fechando: devolve o foco, anima a saída a partir de onde o painel está e desmonta.
  useEffect(() => {
    if (isOpen || !present) return;
    const target = returnTo.current;
    if (restoreFocus.current && target?.isConnected && target.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) !== false) {
      target.focus({ preventScroll: true });
    }
    restoreFocus.current = false;
    returnTo.current = null;

    const reduce = prefersReducedMotion();
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    const animations: Animation[] = [];
    if (panel?.animate) {
      const from = getComputedStyle(panel).transform;
      animations.push(
        panel.animate(
          reduce ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: from === 'none' ? 'translateX(0)' : from }, { transform: 'translateX(100%)' }],
          { duration: reduce ? 120 : 200, easing: EASE_DRAWER, fill: 'forwards' },
        ),
      );
    }
    if (overlay?.animate) {
      animations.push(overlay.animate([{ opacity: getComputedStyle(overlay).opacity }, { opacity: 0 }], { duration: reduce ? 120 : 180, easing: EASE_OUT, fill: 'forwards' }));
    }

    let cancelled = false;
    const unmount = () => !cancelled && setPresent(false);
    Promise.all(animations.map((a) => a.finished)).then(unmount, unmount);
    const safety = window.setTimeout(unmount, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      animations.forEach((a) => a.cancel());
    };
  }, [isOpen, present]);

  // Tab circula dentro da gaveta.
  const trapFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!present) return null;

  const closing = !isOpen;
  const blocked = issues > 0 || validCount === 0;

  return (
    // Saindo: a página volta a responder na hora (sem bloquear clique nem foco).
    <div className={cn('fixed inset-0 z-[60]', closing && 'pointer-events-none')} inert={closing}>
      <div ref={overlayRef} className="animate-fade absolute inset-0 bg-black/70" onClick={dismiss} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho"
        onKeyDown={trapFocus}
        className="animate-drawer absolute inset-y-0 right-0 flex w-[calc(100%-2.5rem)] max-w-[26rem] flex-col border-l border-line-strong bg-steel shadow-[-32px_0_64px_-32px_rgb(0_0_0/0.9)]"
      >
        {/* Luz do teto no topo do painel */}
        <span aria-hidden className="pointer-events-none absolute inset-x-[18%] top-0 z-10 h-px bg-light/70" />

        <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line pl-5 pr-3">
          <div className="flex items-baseline gap-3">
            <h2 className="heading-display text-[1.75rem] text-fg">Carrinho</h2>
            <span className="text-sm tabular-nums text-muted">
              {count} {count === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={dismiss} aria-label="Fechar carrinho">
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </Button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 pb-12 text-center">
            {/* Armário vazio: plaquinha sem nome e o nicho sem camisa */}
            <div aria-hidden className="locker w-[5.5rem] rounded-[var(--radius-card)]">
              <div className="h-5 border-b border-line" />
              <div className="grid aspect-[3/4] place-items-center bg-[#0a0c10]">
                <Shirt className="size-7 text-muted" strokeWidth={1.75} />
              </div>
            </div>
            <h3 className="heading-display mt-7 text-[1.75rem] text-fg">Seu carrinho está vazio</h3>
            <p className="mt-2.5 max-w-[30ch] text-sm leading-relaxed text-muted">As camisas que você adicionar ficam guardadas aqui.</p>
            <LinkButton href="/camisas" onClick={close} className="mt-7">
              Ver camisas
            </LinkButton>
          </div>
        ) : (
          <>
            {issues > 0 && (
              <div className="flex items-center gap-3 border-b border-warn/25 bg-warn/[0.07] px-5 py-2 text-xs text-warn">
                <AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1">{issues === 1 ? 'Um item precisa de ajuste.' : `${issues} itens precisam de ajuste.`}</span>
                <button
                  type="button"
                  onClick={resolveIssues}
                  className="inline-flex h-8 items-center rounded-[var(--radius-button)] px-1 font-bold underline decoration-warn/40 underline-offset-2 transition-[text-decoration-color] duration-150 hover:decoration-warn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  Resolver
                </button>
              </div>
            )}

            {/* scroll-py igual ao padding: o item focado pelo Tab para longe da borda e o contorno não é cortado */}
            <ul className="flex-1 scroll-py-3 space-y-2 overflow-y-auto overscroll-contain p-3 sm:scroll-py-4 sm:p-4">
              {lines.map((line) => (
                <CartLineItem key={`${line.productId}-${line.size}`} line={line} />
              ))}
            </ul>

            <footer className="shrink-0 border-t border-line-strong bg-steel-2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-fg-2">Frete</dt>
                  <dd className="text-muted">Calculado no checkout</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-fg">
                    <span className="font-semibold">Subtotal</span>{' '}
                    <span className="tabular-nums text-muted">
                      ({validCount} {validCount === 1 ? 'item' : 'itens'})
                    </span>
                  </dt>
                  <dd className="text-2xl font-extrabold tabular-nums text-fg">{formatPrice(subtotal)}</dd>
                </div>
              </dl>
              {blocked ? (
                <Button block size="lg" disabled className="mt-4">
                  Ajuste o carrinho para continuar
                </Button>
              ) : (
                <LinkButton href="/checkout" block size="lg" onClick={close} className="mt-4">
                  Finalizar compra
                </LinkButton>
              )}
              <div className="mt-2 flex items-center justify-between gap-3">
                <LinkButton href="/carrinho" variant="secondary" size="sm" onClick={close}>
                  Ver carrinho
                </LinkButton>
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex h-9 items-center rounded-[var(--radius-button)] px-1 text-sm font-semibold text-fg-2 underline-offset-4 transition-[color,transform,scale] duration-150 ease-[var(--ease-out-fz)] hover:text-fg hover:underline active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  Continuar comprando
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

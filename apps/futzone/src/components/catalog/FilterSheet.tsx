'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { productNoun } from './scope';

interface FilterSheetProps {
  id: string;
  open: boolean;
  onClose(): void;
  onClear(): void;
  resultCount: number;
  /** Botão que abriu a gaveta: recebe o foco de volta ao fechar. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Gaveta de filtros do celular. Sobe da base (320ms) e desce mais rápido
 * (200ms) antes de desmontar. Prende o foco enquanto aberta, fecha com Esc,
 * trava a rolagem da página e devolve o foco ao botão "Filtros".
 */
export function FilterSheet({ id, open, onClose, onClear, resultCount, returnFocusRef, children }: FilterSheetProps) {
  const [present, setPresent] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Abrir monta na mesma renderização (sem quadro vazio).
  if (open && !present) setPresent(true);

  // Aberta: trava a rolagem, foca o fechar, Esc fecha, e passa ao desktop fecha.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    const desktop = window.matchMedia('(min-width: 64rem)');
    const onDesktop = (e: MediaQueryListEvent) => e.matches && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onDesktop);
    };
  }, [open]);

  // Fechando: devolve o foco, anima a saída (mais curta que a entrada) e desmonta.
  useEffect(() => {
    if (open || !present) return;
    returnFocusRef.current?.focus({ preventScroll: true });

    const reduce = prefersReducedMotion();
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const animations: Animation[] = [];
    if (panel?.animate) {
      animations.push(
        panel.animate(reduce ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], {
          duration: reduce ? 120 : 200,
          easing: EASE_DRAWER,
          fill: 'forwards',
        }),
      );
    }
    if (backdrop?.animate) {
      animations.push(backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 120 : 180, easing: EASE_OUT, fill: 'forwards' }));
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
  }, [open, present, returnFocusRef]);

  // Tab circula dentro da gaveta (painéis recolhidos são `inert` e ficam de fora).
  const trapFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[inert]'));
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

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div ref={backdropRef} className="animate-fade absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        onKeyDown={trapFocus}
        className="animate-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-xl border-t border-line-strong bg-steel shadow-[0_-24px_60px_-20px_rgb(0_0_0/0.8)]"
      >
        {/* Borda de luz no topo da gaveta, como a lâmpada do armário */}
        <span aria-hidden className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-light/70" />
        <div className="flex items-center justify-between gap-4 border-b border-line py-2 pl-5 pr-3">
          <h2 className="heading-display text-[1.75rem] text-fg">Filtros</h2>
          <Button ref={closeRef} variant="ghost" size="icon" onClick={onClose} aria-label="Fechar filtros">
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 [&>*:first-child]:border-t-0">{children}</div>
        <div className="grid grid-cols-[auto_1fr] gap-2 border-t border-line bg-steel-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" onClick={onClear}>
            Limpar
          </Button>
          <Button onClick={onClose}>
            Ver {resultCount} {productNoun(resultCount)}
          </Button>
        </div>
      </div>
    </div>
  );
}

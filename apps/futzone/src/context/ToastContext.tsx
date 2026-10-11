'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/format';
import { useCart } from './CartContext';

type ToastTone = 'success' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  notify(message: string, tone?: ToastTone): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, info: Info, warning: TriangleAlert } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { isOpen: cartOpen } = useCart();

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/*
        Com o carrinho aberto, os avisos não cobrem o rodapé da gaveta ("Finalizar compra"):
        no desktop passam para a esquerda dela; em telas menores ficam só para leitores de tela
        (a própria gaveta confirma o que entrou) e reaparecem se ainda valerem quando ela fechar.
      */}
      <div
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 transition-opacity duration-150 sm:items-end sm:pr-6',
          cartOpen && 'max-lg:opacity-0 max-lg:[&_*]:pointer-events-none! lg:pr-[calc(26rem+1.5rem)]',
        )}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className="animate-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-line-strong bg-steel-2 px-4 py-3 text-sm text-fg shadow-[0_18px_40px_-16px_rgb(0_0_0/0.85)]"
            >
              <Icon className={cn('size-5 shrink-0', t.tone === 'warning' ? 'text-warn' : t.tone === 'success' ? 'text-success' : 'text-fg-2')} strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} className="rounded p-1 text-muted transition-colors duration-150 hover:text-fg" aria-label="Fechar aviso">
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}

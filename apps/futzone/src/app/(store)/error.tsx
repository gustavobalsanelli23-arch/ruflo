'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';

/**
 * Erro inesperado numa página da loja (Next 16: props `error` e `retry`).
 * Explica sem expor detalhes técnicos; só o código opaco (`digest`), que liga
 * o relato do visitante ao log do servidor.
 */
export default function StoreError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-fz py-16 sm:py-24">
      <div className="locker relative mx-auto max-w-xl overflow-hidden rounded-[var(--radius-card)] px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-12">
        <span aria-hidden className="absolute inset-x-[14%] top-0 h-[2px] bg-line-strong" />
        <h1 className="heading-display text-[2.5rem] text-fg sm:text-5xl">Lance interrompido</h1>
        <p className="mt-4 max-w-[52ch] leading-relaxed text-fg-2">
          Algo deu errado ao abrir esta página. Tente de novo; se o problema continuar, volte ao início e siga pela loja.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-muted">
            Código do erro: <span className="font-mono tabular-nums text-fg-2">{error.digest}</span>
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-2.5">
          <Button onClick={() => retry()}>
            <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />
            Tentar de novo
          </Button>
          <LinkButton href="/" variant="outline">
            Voltar ao início
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

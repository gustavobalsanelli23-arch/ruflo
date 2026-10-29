'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/data/states';

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Não foi possível carregar esta tela</h1>
      <Notice tone="error" title="Os dados da organização não chegaram">
        Tente de novo. Se o problema continuar, informe o código abaixo ao suporte.
        {error.digest && (
          <span className="mt-1 block text-xs" translate="no">
            Código: {error.digest}
          </span>
        )}
      </Notice>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>
          <RotateCcw aria-hidden="true" />
          Tentar de novo
        </Button>
        <Button asChild variant="outline">
          <Link href="/visao-geral">Ir para a visão executiva</Link>
        </Button>
      </div>
    </div>
  );
}

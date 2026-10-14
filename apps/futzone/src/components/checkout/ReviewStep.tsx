'use client';

import { AlertTriangle } from 'lucide-react';
import type { CartLine } from '@/lib/cart';
import type { StockIssue } from '@/services/inventory.service';
import { STOCK_ISSUE_MESSAGE } from '@/services/inventory.service';
import { Button, LinkButton } from '@/components/ui/Button';
import { OrderLines } from './OrderSummary';

interface Props {
  lines: CartLine[];
  issues: StockIssue[];
  /** Produtos com preço diferente do link de pagamento do tipo deles. */
  priceIssues: string[];
  totalsSlot: React.ReactNode;
  onContinue(): void;
}

/** Revisão antes do pagamento: itens e totais (endereço e frete são preenchidos na Stripe). */
export function ReviewStep({ lines, issues, priceIssues, totalsSlot, onContinue }: Props) {
  const blocked = issues.length > 0 || priceIssues.length > 0;
  return (
    <div className="space-y-6">
      {issues.length > 0 && (
        <div role="alert" className="space-y-2 rounded-[var(--radius-card)] border border-danger/30 bg-danger/[0.06] p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-danger">
            <AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden /> Revise seu carrinho
          </p>
          <ul className="space-y-1 text-fg-2">
            {issues.map((i) => (
              <li key={i.productId + i.size}>
                {i.name} ({i.size}): {i.kind === 'indisponivel' ? STOCK_ISSUE_MESSAGE.indisponivel : `restam ${i.available} ${i.available === 1 ? 'unidade' : 'unidades'}.`}
              </li>
            ))}
          </ul>
          <LinkButton href="/carrinho" size="sm" variant="secondary">
            Ajustar carrinho
          </LinkButton>
        </div>
      )}

      {priceIssues.length > 0 && (
        <div role="alert" className="space-y-2 rounded-[var(--radius-card)] border border-danger/30 bg-danger/[0.06] p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-danger">
            <AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden /> Produto indisponível para pagamento
          </p>
          <p className="text-fg-2">
            {priceIssues.join(', ')}: o preço mudou e ainda não pode ser pago online. Remova do carrinho ou fale com a loja.
          </p>
          <LinkButton href="/carrinho" size="sm" variant="secondary">
            Ajustar carrinho
          </LinkButton>
        </div>
      )}

      <OrderLines lines={lines} />

      <div className="border-t border-line pt-5">{totalsSlot}</div>

      <Button size="lg" block className="sm:w-auto" onClick={onContinue} disabled={blocked}>
        Continuar
      </Button>
    </div>
  );
}

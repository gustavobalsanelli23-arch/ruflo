'use client';

import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Notice } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { formatPrice, PLANS, type PlanId } from '@/config/plans';
import { formatDate } from '@/lib/format';
import { track } from '@/lib/tracking/product-analytics';
import { openBillingPortalAction, startCheckoutAction } from './actions';

export interface BillingInfo {
  /** Online billing configured on the server (Stripe keys present). */
  enabled: boolean;
  isOwner: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'ativa',
  trialing: 'em teste',
  past_due: 'com pagamento atrasado',
  unpaid: 'não paga',
  canceled: 'cancelada',
  incomplete: 'aguardando o primeiro pagamento',
  incomplete_expired: 'expirada',
  paused: 'pausada',
};

const SUBSCRIBED = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused']);

/** Subscribe, change or cancel the plan through Stripe (owner only). */
export function PlanBilling({ plan, billing }: { plan: PlanId; billing: BillingInfo }) {
  const [pending, start] = useTransition();
  const params = useSearchParams();
  const outcome = params.get('cobranca');

  if (!billing.enabled) return null;
  const subscribed = billing.status !== null && SUBSCRIBED.has(billing.status);

  const go = (run: () => ReturnType<typeof openBillingPortalAction>) =>
    start(async () => {
      const result = await run();
      if (result.ok) window.location.assign(result.url);
      else toast.error('Não foi possível abrir o pagamento', { description: result.error.message });
    });

  return (
    <div className="flex flex-col gap-4">
      {outcome === 'ok' && (
        <Notice tone="success" title="Pagamento recebido">
          O plano muda assim que a confirmação chegar, em geral em poucos segundos. Recarregue a página se ainda não mudou.
        </Notice>
      )}
      {outcome === 'cancelado' && <Notice title="Assinatura não concluída">Nada foi cobrado. Você pode tentar de novo quando quiser.</Notice>}

      {billing.status && (
        <p className="text-sm text-muted-foreground">
          Assinatura {STATUS_LABEL[billing.status] ?? billing.status}
          {billing.currentPeriodEnd &&
            (billing.cancelAtPeriodEnd
              ? `. Termina em ${formatDate(billing.currentPeriodEnd)} e volta ao Free.`
              : `. Próxima cobrança em ${formatDate(billing.currentPeriodEnd)}.`)}
        </p>
      )}

      {!billing.isOwner ? (
        <p className="text-sm text-muted-foreground">Só o proprietário da organização muda o plano.</p>
      ) : subscribed ? (
        <div>
          <Button variant="outline" disabled={pending} onClick={() => go(openBillingPortalAction)}>
            {pending ? 'Abrindo…' : 'Mudar plano, cartão ou cancelar'}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Abre o portal seguro da Stripe, onde ficam também as faturas.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {PLANS.filter((option) => option.monthlyPrice > 0 && option.id !== plan).map((option) => (
            <Button
              key={option.id}
              variant={option.highlight ? 'default' : 'outline'}
              disabled={pending}
              onClick={() => {
                track('plano_escolhido', { plano: option.id });
                go(() => startCheckoutAction(option.id));
              }}
            >
              Assinar {option.name} · {formatPrice(option.monthlyPrice)}/mês
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

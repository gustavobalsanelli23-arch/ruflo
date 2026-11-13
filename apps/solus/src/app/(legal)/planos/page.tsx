import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/config/legal';
import { COMMON_FEATURES, formatCount, formatPrice, PLANS, type Plan } from '@/config/plans';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Planos' };

const contactReady = LEGAL.supportEmail.includes('@') && !LEGAL.supportEmail.includes('[');

function planAction(plan: Plan) {
  if (plan.monthlyPrice === 0) return { href: '/cadastro', label: 'Começar no Free' };
  if (contactReady) {
    const subject = encodeURIComponent(`Quero o plano ${plan.name} do SOLUS`);
    return { href: `mailto:${LEGAL.supportEmail}?subject=${subject}`, label: `Pedir o plano ${plan.name}` };
  }
  // Until a contact exists, paid plans start from a Free account.
  return { href: '/cadastro', label: `Criar conta e pedir o ${plan.name}` };
}

export default function PlansPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Planos</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
        Todos os planos têm as mesmas funções. Eles mudam só no número de pessoas, nas linhas de dados guardadas e nas perguntas ao
        analista de IA por dia. Preços mensais, em reais.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const action = planAction(plan);
          return (
            <li
              key={plan.id}
              className={cn(
                'flex flex-col rounded-xl border bg-card p-5',
                plan.highlight ? 'border-brand ring-1 ring-brand' : 'border-border',
              )}
            >
              <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
              <p className="mt-1 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <p className="mt-4 text-foreground">
                <span className="text-3xl font-semibold tracking-tight">{formatPrice(plan.monthlyPrice)}</span>
                {plan.monthlyPrice > 0 && <span className="text-sm text-muted-foreground"> por mês</span>}
              </p>
              <dl className="mt-5 flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Pessoas</dt>
                  <dd className="font-medium text-foreground">{plan.limits.members}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Linhas guardadas</dt>
                  <dd className="font-medium text-foreground">{formatCount(plan.limits.rows)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Perguntas à IA por dia</dt>
                  <dd className="font-medium text-foreground">{plan.limits.aiPerDay}</dd>
                </div>
              </dl>
              <Link
                href={action.href}
                className={cn(
                  'mt-6 inline-flex h-10 items-center justify-center rounded-lg px-4 text-center text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  plan.highlight ? 'bg-primary text-primary-foreground hover:bg-primary/85' : 'border border-border text-foreground hover:bg-muted',
                )}
              >
                {action.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="mt-12" aria-labelledby="em-todos">
        <h2 id="em-todos" className="text-xl font-semibold tracking-tight text-foreground">
          Em todos os planos
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {COMMON_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[15px] text-foreground">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand" />
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-3 text-[15px] leading-7 text-foreground" aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="text-xl font-semibold tracking-tight text-foreground">
          Como funciona
        </h2>
        <ul className="list-disc pl-6">
          <li>Toda organização começa no Free. Para mudar de plano, peça pelo atendimento; a mudança vale na hora.</li>
          <li>Linhas guardadas são as linhas de vendas e de estoque da organização. Desfazer uma importação libera o espaço dela.</li>
          <li>As perguntas à IA voltam a ficar disponíveis à meia-noite, no horário de Brasília.</li>
          <li>
            Pode cancelar quando quiser. Veja a{' '}
            <Link href="/reembolso" className="font-medium text-brand underline underline-offset-4">
              política de reembolso
            </Link>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}

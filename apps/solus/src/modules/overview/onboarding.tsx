import Link from 'next/link';
import { ArrowUpRight, Circle, CircleCheck, CircleDot } from 'lucide-react';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { Button } from '@/components/ui/button';
import { can, ROLE_LABEL } from '@/lib/auth/permissions';
import { pluralize } from '@/lib/format';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { Greeting } from '@/modules/overview/greeting';
import { listMembers } from '@/services/organization-data';
import type { ActiveWorkspace } from '@/services/workspace';

type StepState = 'done' | 'current' | 'upcoming';

const STATE = {
  done: { icon: CircleCheck, label: 'Concluído', className: 'text-positive-text' },
  current: { icon: CircleDot, label: 'Próximo passo', className: 'text-brand' },
  upcoming: { icon: Circle, label: 'A seguir', className: 'text-subtle-foreground' },
} as const;

/**
 * Before the organization has business data, the executive overview is a
 * checklist built from real state (the organization, its members, its
 * imports). It never shows figures the company does not have.
 */
export async function Onboarding({ workspace }: { workspace: ActiveWorkspace }) {
  const { user, active } = workspace;
  const supabase = await createSupabaseServerClient();
  const members = supabase ? await listMembers(supabase, active.organizationId) : [];
  const firstName = user.fullName?.split(' ')[0] ?? user.displayName;
  const canInvite = can(active.role, 'manageMembers');
  const canImport = can(active.role, 'import');
  const hasTeam = members.length > 1;

  const steps: { title: string; detail: string; state: StepState; action?: { href: string; label: string } }[] = [
    {
      title: 'Criar a organização',
      detail: `${active.name} está criada. Seu papel: ${ROLE_LABEL[active.role].toLowerCase()}.`,
      state: 'done',
    },
    {
      title: 'Importar vendas, produtos e estoque',
      detail: canImport
        ? 'Envie planilhas CSV ou Excel (.xlsx). Comece pelo cadastro de produtos, depois vendas e a posição de estoque.'
        : 'Peça a um analista ou administrador para importar as planilhas da empresa.',
      state: 'current',
      action: canImport ? { href: '/dados', label: 'Importar dados' } : undefined,
    },
    {
      title: 'Convidar a equipe',
      detail: hasTeam
        ? `${pluralize(members.length, 'pessoa tem', 'pessoas têm')} acesso a esta organização.`
        : canInvite
          ? 'Convide quem acompanha os números, cada pessoa com o papel adequado.'
          : 'Peça a um administrador para convidar outras pessoas.',
      state: hasTeam ? 'done' : 'current',
      action: canInvite ? { href: '/configuracoes?secao=membros', label: hasTeam ? 'Gerenciar membros' : 'Convidar pessoas' } : undefined,
    },
    {
      title: 'Acompanhar as análises',
      detail: 'Assim que a primeira importação terminar, visão executiva, lucratividade, estoque e oportunidades passam a usar os dados da sua empresa.',
      state: 'upcoming',
    },
  ];

  return (
    <>
      <PageHeader title={<Greeting name={firstName} />} description={`Primeiros passos de ${active.name}.`} />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-8" title="Primeiros passos" description="Os indicadores aparecem aqui assim que houver dados da empresa.">
          <ol className="flex flex-col">
            {steps.map((step, index) => {
              const spec = STATE[step.state];
              return (
                <li key={step.title} className={cn('flex gap-4 py-4', index > 0 && 'border-t')}>
                  <spec.icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', spec.className)} strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className={cn('text-base font-medium', step.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground')}>
                        {step.title}
                      </h3>
                      <span className={cn('text-xs font-medium', spec.className)}>{spec.label}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                    {step.action && (
                      <Button asChild size="sm" variant={step.state === 'current' ? 'default' : 'outline'} className="mt-3">
                        <Link href={step.action.href}>{step.action.label}</Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel className="lg:col-span-4" title="Como fica com dados">
          <p className="text-sm text-muted-foreground">
            A demonstração mostra a visão executiva completa de uma empresa fictícia: receita, lucro, margem, estoque e as oportunidades encontradas
            nos dados.
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/demo/visao-geral">
              Abrir a demonstração
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
          <p className="mt-2 text-xs text-subtle-foreground">Empresa e números fictícios, separados da sua organização.</p>
        </Panel>
      </div>
    </>
  );
}

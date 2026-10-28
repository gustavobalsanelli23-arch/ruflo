import Link from 'next/link';
import { Database, MessageSquareText, OctagonAlert, PackageX, Radar, TriangleAlert, UserPlus, type LucideIcon } from 'lucide-react';
import { Delta } from '@/components/data/delta';
import { Meter } from '@/components/data/meter';
import { Panel } from '@/components/data/panel';
import { OPPORTUNITY_CATEGORY, PriorityMark } from '@/components/data/status';
import { TextLink } from '@/components/data/text-link';
import type { ActivityItem, CategoryPerformance, InventorySnapshot, Opportunity, OpportunitySummary } from '@/lib/data/types';
import { formatCurrency, formatDateTime, formatDays, formatPercent, pluralize, relativeChange } from '@/lib/format';
import { cn } from '@/lib/utils';
import { impactShort } from '@/modules/opportunities/impact';

export function TopOpportunities({ items, summary }: { items: Opportunity[]; summary: OpportunitySummary }) {
  return (
    <Panel
      title="Oportunidades prioritárias"
      description="O que a SOLUS encontrou nos dados, por prioridade e ganho esperado."
      action={<TextLink href="/oportunidades">Ver todas</TextLink>}
      footer={
        <p className="text-xs text-subtle-foreground">
          Valores estimados com as premissas descritas em cada oportunidade. Não são ganhos garantidos.
        </p>
      }
      className="h-full"
    >
      <dl className="grid grid-cols-2 gap-4 border-b pb-4">
        <div>
          <dt className="text-xs text-muted-foreground">Ganho mensal estimado</dt>
          <dd className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-foreground">
            {formatCurrency(summary.monthlyImpact, { whole: true })}
            <span className="ml-1 text-xs font-normal text-subtle-foreground">/mês</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ganhos pontuais estimados</dt>
          <dd className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-foreground">
            {formatCurrency(summary.oneOffImpact, { whole: true })}
          </dd>
        </div>
      </dl>
      <ol className="-mx-2 mt-2 flex flex-col" aria-label={`${summary.open} oportunidades abertas, as 3 primeiras`}>
        {items.map((op, index) => {
          const impact = impactShort(op);
          return (
            <li key={op.id}>
              <Link
                href={`/oportunidades?id=${op.id}`}
                className="group flex gap-3 rounded-lg px-2 py-2.5 outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-brand-soft text-xs font-semibold text-brand tabular"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-5 font-medium text-foreground">{op.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <PriorityMark priority={op.priority} />
                    <span className="text-xs text-subtle-foreground">{OPPORTUNITY_CATEGORY[op.category]}</span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular text-foreground">{impact.value}</span>
                  <span className="block text-2xs text-subtle-foreground">{impact.suffix}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

export function InventoryHealth({ inventory }: { inventory: InventorySnapshot }) {
  return (
    <Panel
      title="Estoque"
      description="Posição atual, sem filtro de período."
      action={<TextLink href="/estoque">Ver estoque</TextLink>}
      className="h-full"
    >
      <dl className="grid grid-cols-3 gap-4 border-b pb-4">
        <div>
          <dt className="text-xs text-muted-foreground">Estoque a custo</dt>
          <dd className="mt-0.5 text-xl font-semibold tracking-[-0.02em]">{formatCurrency(inventory.stockValue, { compact: true })}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cobertura média</dt>
          <dd className="mt-0.5 text-xl font-semibold tracking-[-0.02em]">{formatDays(inventory.averageCoverageDays)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Itens saudáveis</dt>
          <dd className="mt-0.5 text-xl font-semibold tracking-[-0.02em]">{formatPercent(inventory.healthyShare, 0)}</dd>
          <dd className="mt-1.5">
            <Meter value={inventory.healthyShare} tone="positive" label="Itens em situação saudável" />
          </dd>
        </div>
      </dl>

      <section aria-labelledby="ruptura-titulo" className="mt-4">
        <h3 id="ruptura-titulo" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <OctagonAlert aria-hidden="true" className="size-4 text-critical-text" />
          Risco de ruptura
          <span className="font-normal text-muted-foreground">{pluralize(inventory.ruptureRiskCount, 'item', 'itens')}</span>
        </h3>
        <ul className="mt-2 flex flex-col divide-y text-sm">
          {inventory.ruptureItems.slice(0, 3).map((item) => (
            <li key={item.productId} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0 truncate text-foreground">{item.name}</span>
              <span className="shrink-0 text-xs tabular text-muted-foreground">
                cobre {formatDays(item.coverageDays)}, entrega em {formatDays(item.leadTimeDays)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-2 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-foreground">
        <PackageX aria-hidden="true" className="size-4 shrink-0 text-warning-text" />
        <span className="min-w-0 flex-1">
          {formatCurrency(inventory.stalledValue, { whole: true })} parados há mais de 60 dias, em {pluralize(inventory.stalledCount, 'item', 'itens')}
        </span>
      </p>
    </Panel>
  );
}

const LOW_CATEGORY_MARGIN = 0.3;

export function CategoryBreakdown({ categories }: { categories: CategoryPerformance[] }) {
  const max = Math.max(...categories.map((c) => c.revenue));
  return (
    <Panel
      title="Desempenho por categoria"
      description="Receita no período, participação, lucro bruto e margem, com a variação contra o período anterior."
      action={<TextLink href="/lucratividade">Ver lucratividade</TextLink>}
      className="h-full"
    >
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Desempenho por categoria no período</caption>
          <thead>
            <tr className="border-y text-xs text-muted-foreground">
              <th scope="col" className="h-9 pl-5 text-left font-medium">
                Categoria
              </th>
              <th scope="col" className="hidden h-9 px-3 text-left font-medium md:table-cell">
                <span className="sr-only">Participação na receita, em barra</span>
              </th>
              <th scope="col" className="h-9 px-3 text-right font-medium">
                Receita
              </th>
              <th scope="col" className="hidden h-9 px-3 text-right font-medium sm:table-cell">
                Lucro bruto
              </th>
              <th scope="col" className="h-9 px-3 text-right font-medium">
                Margem
              </th>
              <th scope="col" className="hidden h-9 pr-5 pl-3 text-right font-medium sm:table-cell">
                Var. receita
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((category) => {
              const low = category.margin < LOW_CATEGORY_MARGIN;
              return (
                <tr key={category.categoryId} className="transition-colors hover:bg-accent/60">
                  <th scope="row" className="py-2.5 pl-5 text-left font-normal text-foreground">
                    <span className="block truncate">{category.name}</span>
                    <span className="block text-xs text-subtle-foreground tabular">{formatPercent(category.share)} da receita</span>
                  </th>
                  <td className="hidden w-[28%] px-3 md:table-cell" aria-hidden="true">
                    <span className="block h-2 rounded-r-[3px] bg-series-1" style={{ width: `${(category.revenue / max) * 100}%` }} />
                  </td>
                  <td className="px-3 text-right font-medium tabular text-foreground">
                    {formatCurrency(category.revenue, { compact: true, whole: true })}
                  </td>
                  <td className="hidden px-3 text-right tabular text-muted-foreground sm:table-cell">
                    {formatCurrency(category.grossProfit, { compact: true, whole: true })}
                  </td>
                  <td className="px-3 text-right tabular">
                    <span className="inline-flex items-center gap-1 text-foreground">
                      {low && <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" />}
                      {formatPercent(category.margin)}
                      {low && <span className="sr-only">, abaixo de {formatPercent(LOW_CATEGORY_MARGIN, 0)}</span>}
                    </span>
                    <Delta size="xs" kind="points" value={category.margin - category.previousMargin} className="flex justify-end" />
                  </td>
                  <td className="hidden pr-5 pl-3 text-right sm:table-cell">
                    <Delta size="xs" value={relativeChange(category.revenue, category.previousRevenue)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-subtle-foreground">
        <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" />
        Margem abaixo de {formatPercent(LOW_CATEGORY_MARGIN, 0)}, a referência definida para esta demonstração.
      </p>
    </Panel>
  );
}

const ACTIVITY_ICON: Record<ActivityItem['kind'], LucideIcon> = {
  import: Database,
  opportunity: Radar,
  alert: TriangleAlert,
  member: UserPlus,
  analysis: MessageSquareText,
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Panel title="Atividade recente" description="Importações, análises e oportunidades da equipe." className="h-full">
      <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[13px] before:w-px before:bg-border">
        {items.map((item) => {
          const Icon = ACTIVITY_ICON[item.kind];
          return (
            <li key={item.id} className="relative flex gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border bg-card',
                  item.kind === 'alert' ? 'text-warning-text' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
                <p className="mt-0.5 text-xs text-subtle-foreground">
                  <time dateTime={item.at}>{formatDateTime(item.at)}</time>
                  {item.actor && <span>, {item.actor}</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

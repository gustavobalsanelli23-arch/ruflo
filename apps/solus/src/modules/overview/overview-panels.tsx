import Link from 'next/link';
import {
  ArrowRight,
  Database,
  MessageSquareText,
  Radar,
  TriangleAlert,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Delta } from '@/components/data/delta';
import { Meter } from '@/components/data/meter';
import { Panel } from '@/components/data/panel';
import { OPPORTUNITY_CATEGORY, PriorityMark } from '@/components/data/status';
import type { ActivityItem, CategoryPerformance, InventorySnapshot, Opportunity } from '@/lib/data/types';
import { formatCurrency, formatDateTime, formatDays, formatPercent, relativeChange } from '@/lib/format';
import { cn } from '@/lib/utils';
import { impactShort } from '@/modules/opportunities/impact';

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded text-sm font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-3.5" />
    </Link>
  );
}

export function TopOpportunities({ items, total }: { items: Opportunity[]; total: number }) {
  return (
    <Panel
      title="Oportunidades prioritárias"
      description="Ordenadas por prioridade e ganho esperado."
      footer={<MoreLink href="/oportunidades">Ver todas as {total} oportunidades abertas</MoreLink>}
      className="h-full"
      bodyClassName="px-2 pb-2"
    >
      <ol className="flex flex-col">
        {items.map((op, index) => {
          const impact = impactShort(op);
          return (
            <li key={op.id}>
              <Link
                href={`/oportunidades?id=${op.id}`}
                className="group flex gap-3 rounded-lg px-3 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-neutral-soft text-xs font-semibold text-muted-foreground tabular"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-5 font-medium text-foreground group-hover:text-foreground">{op.title}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
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

export function CategoryBreakdown({ categories }: { categories: CategoryPerformance[] }) {
  const max = Math.max(...categories.map((c) => c.revenue));
  return (
    <Panel
      title="Desempenho por categoria"
      description="Receita no período, com margem bruta e variação."
      action={<MoreLink href="/lucratividade">Lucratividade</MoreLink>}
    >
      <div className="hidden grid-cols-[minmax(9.5rem,1.4fr)_minmax(0,2fr)_6rem_4.5rem_5rem] gap-4 pb-2 text-xs text-subtle-foreground md:grid">
        <span>Categoria</span>
        <span>Receita</span>
        <span className="text-right">Valor</span>
        <span className="text-right">Margem</span>
        <span className="text-right">Variação</span>
      </div>
      <ul className="flex flex-col divide-y">
        {categories.map((category) => {
          const lowMargin = category.margin < 0.3;
          return (
            <li
              key={category.categoryId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5 md:grid-cols-[minmax(9.5rem,1.4fr)_minmax(0,2fr)_6rem_4.5rem_5rem]"
            >
              <span className="truncate text-sm text-foreground">{category.name}</span>
              <span className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto" aria-hidden="true">
                <span className="block h-2 overflow-hidden rounded-full">
                  <span
                    className="block h-full rounded-r-[4px] bg-series-1"
                    style={{ width: `${(category.revenue / max) * 100}%` }}
                  />
                </span>
              </span>
              <span className="text-right text-sm font-medium tabular text-foreground">
                {formatCurrency(category.revenue, { compact: true, whole: true })}
              </span>
              <span
                className={cn(
                  'hidden items-center justify-end gap-1 text-right text-sm tabular md:flex',
                  lowMargin ? 'text-warning-text' : 'text-muted-foreground',
                )}
              >
                {lowMargin && <TriangleAlert aria-label="Margem abaixo de 30%" className="size-3.5" />}
                {formatPercent(category.margin)}
              </span>
              <span className="hidden justify-end md:flex">
                <Delta size="xs" value={relativeChange(category.revenue, category.previousRevenue)} />
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function InventoryHealth({ inventory }: { inventory: InventorySnapshot }) {
  return (
    <Panel title="Saúde do estoque" action={<MoreLink href="/estoque">Estoque</MoreLink>}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <div>
          <dt className="text-sm text-muted-foreground">Estoque a custo</dt>
          <dd className="mt-1 text-xl font-semibold tracking-[-0.02em]">{formatCurrency(inventory.stockValue, { compact: true })}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Cobertura média</dt>
          <dd className="mt-1 text-xl font-semibold tracking-[-0.02em]">{formatDays(inventory.averageCoverageDays)}</dd>
        </div>
      </dl>
      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Itens em situação saudável</span>
          <span className="font-medium tabular">{formatPercent(inventory.healthyShare, 0)}</span>
        </div>
        <Meter value={inventory.healthyShare} tone="positive" label="Itens em situação saudável" />
      </div>
      <ul className="mt-5 flex flex-col gap-2 text-sm">
        <li className="flex items-center justify-between gap-3 rounded-lg bg-critical-soft px-3 py-2">
          <span className="flex items-center gap-2 text-foreground">
            <span className="size-1.5 rounded-full bg-critical" aria-hidden="true" />
            Risco de ruptura
          </span>
          <span className="font-semibold tabular text-critical-text">{inventory.ruptureRiskCount} itens</span>
        </li>
        <li className="flex items-center justify-between gap-3 rounded-lg bg-warning-soft px-3 py-2">
          <span className="flex items-center gap-2 text-foreground">
            <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
            Parado há mais de 60 dias
          </span>
          <span className="font-semibold tabular text-warning-text">{formatCurrency(inventory.stalledValue, { whole: true })}</span>
        </li>
      </ul>
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
    <Panel title="Atividade recente">
      <ol className="relative flex flex-col gap-4">
        {items.map((item) => {
          const Icon = ACTIVITY_ICON[item.kind];
          return (
            <li key={item.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-md border bg-muted',
                  item.kind === 'alert' ? 'text-warning-text' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
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

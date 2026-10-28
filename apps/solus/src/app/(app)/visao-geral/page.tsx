import type { Metadata } from 'next';
import { Delta } from '@/components/data/delta';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { PeriodFrame, PeriodScope, PeriodSelect } from '@/components/data/period-scope';
import { Sparkline } from '@/components/data/sparkline';
import { Stat, StatStrip } from '@/components/data/stat';
import { TextLink } from '@/components/data/text-link';
import { getRepository } from '@/lib/data';
import { formatCurrency, formatNumber, formatPercent, relativeChange } from '@/lib/format';
import { parsePeriod } from '@/lib/period';
import { Briefing } from '@/modules/overview/briefing';
import { Greeting } from '@/modules/overview/greeting';
import { MarginChart } from '@/modules/overview/margin-chart';
import { CategoryBreakdown, InventoryHealth, RecentActivity, TopOpportunities } from '@/modules/overview/overview-panels';
import { RevenueProfitChart } from '@/modules/overview/revenue-profit-chart';

export const metadata: Metadata = { title: 'Visão executiva' };

const BUCKET = { day: 'dia', week: 'semana', month: 'mês' } as const;

/**
 * Command centre, read top to bottom: the analyst's note, the period's
 * headline figures, how they moved, what needs attention, what happened.
 */
export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const period = parsePeriod((await searchParams).periodo);
  const repository = getRepository();
  const [workspace, data] = await Promise.all([repository.getWorkspace(), repository.getOverview(period)]);
  const firstName = workspace.user.name.split(' ')[0] ?? workspace.user.name;
  const { organization } = workspace;
  const trend = data.trend;
  const compact = (value: number) => formatCurrency(value, { compact: true });

  return (
    <PeriodScope period={period}>
      <PageHeader
        title={<Greeting name={firstName} />}
        description={`${organization.name}, ${organization.segment.toLowerCase()} em ${organization.city}, ${organization.state}.`}
        actions={<PeriodSelect />}
      />

      <PeriodFrame className="mt-6 flex flex-col gap-6">
        <Briefing segments={data.briefing} dataThrough={workspace.dataThrough} />

        <StatStrip label={`Indicadores, ${data.period.label.toLowerCase()}`} className="md:grid-cols-3 xl:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <Stat
            className="col-span-2 xl:col-span-1"
            size="xl"
            label={`Receita, ${data.period.label.toLowerCase()}`}
            value={compact(data.revenue.value)}
            delta={<Delta value={relativeChange(data.revenue.value, data.revenue.previous)} />}
            hint={`contra ${compact(data.revenue.previous)}`}
          />
          <Stat
            label="Lucro bruto"
            value={compact(data.grossProfit.value)}
            delta={<Delta size="xs" value={relativeChange(data.grossProfit.value, data.grossProfit.previous)} />}
            hint={`contra ${compact(data.grossProfit.previous)}`}
            trend={<Sparkline values={trend.map((p) => p.grossProfit)} />}
          />
          <Stat
            label="Margem bruta"
            value={formatPercent(data.grossMargin.value)}
            delta={<Delta size="xs" kind="points" value={data.grossMargin.value - data.grossMargin.previous} />}
            hint={`contra ${formatPercent(data.grossMargin.previous)}`}
            trend={<Sparkline values={trend.map((p) => (p.revenue > 0 ? p.grossProfit / p.revenue : 0))} />}
          />
          <Stat
            label="Ticket médio"
            value={formatCurrency(data.averageTicket.value)}
            delta={<Delta size="xs" value={relativeChange(data.averageTicket.value, data.averageTicket.previous)} />}
            hint={`contra ${formatCurrency(data.averageTicket.previous)}`}
            trend={<Sparkline values={trend.map((p) => (p.orders > 0 ? p.revenue / p.orders : 0))} />}
          />
          <Stat
            label="Pedidos"
            value={formatNumber(data.orders.value)}
            delta={<Delta size="xs" value={relativeChange(data.orders.value, data.orders.previous)} />}
            hint={`contra ${formatNumber(data.orders.previous)}`}
            trend={<Sparkline values={trend.map((p) => p.orders)} />}
          />
        </StatStrip>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Panel
            className="xl:col-span-8"
            title="Receita e lucro bruto"
            description={`Cada barra é a receita de um ${BUCKET[data.period.granularity]}: a parte de baixo é o lucro bruto, a de cima é o custo das mercadorias.`}
          >
            <RevenueProfitChart period={data.period} trend={trend} />
          </Panel>
          <Panel
            className="xl:col-span-4"
            title="Margem bruta"
            description={`Quanto sobra de cada real vendido, por ${BUCKET[data.period.granularity]}.`}
            footer={<TextLink href="/lucratividade">Margem por produto e fornecedor</TextLink>}
          >
            <MarginChart period={data.period} trend={trend} previousMargin={data.grossMargin.previous} />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopOpportunities items={data.topOpportunities} summary={data.opportunitySummary} />
          <InventoryHealth inventory={data.inventory} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <CategoryBreakdown categories={data.categories} />
          </div>
          <div className="xl:col-span-4">
            <RecentActivity items={data.activity.slice(0, 4)} />
          </div>
        </div>
      </PeriodFrame>
    </PeriodScope>
  );
}

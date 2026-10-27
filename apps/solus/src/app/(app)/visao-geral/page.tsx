import type { Metadata } from 'next';
import { PeriodFrame, PeriodScope, PeriodSelect } from '@/components/data/period-scope';
import { Delta } from '@/components/data/delta';
import { PageHeader } from '@/components/data/page-header';
import { Sparkline } from '@/components/data/sparkline';
import { Stat, StatStrip } from '@/components/data/stat';
import { getRepository } from '@/lib/data';
import { formatCurrency, formatNumber, formatPercent, relativeChange } from '@/lib/format';
import { parsePeriod } from '@/lib/period';
import { Briefing } from '@/modules/overview/briefing';
import { Greeting } from '@/modules/overview/greeting';
import { CategoryBreakdown, InventoryHealth, RecentActivity, TopOpportunities } from '@/modules/overview/overview-panels';
import { RevenuePanel } from '@/modules/overview/revenue-panel';

export const metadata: Metadata = { title: 'Visão executiva' };

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const period = parsePeriod((await searchParams).periodo);
  const repository = getRepository();
  const [workspace, data] = await Promise.all([repository.getWorkspace(), repository.getOverview(period)]);
  const firstName = workspace.user.name.split(' ')[0] ?? workspace.user.name;
  const lastPoints = data.trend.slice(-12);
  const { organization } = workspace;

  return (
    <PeriodScope period={period}>
      <PageHeader
        title={<Greeting name={firstName} />}
        description={`${organization.name}, ${organization.segment.toLowerCase()} em ${organization.city}, ${organization.state}.`}
        actions={<PeriodSelect />}
      />

      <PeriodFrame className="mt-8 flex flex-col gap-6">
        <Briefing segments={data.briefing} dataThrough={workspace.dataThrough} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <RevenuePanel period={data.period} revenue={data.revenue} grossProfit={data.grossProfit} trend={data.trend} />
          </div>
          <div className="xl:col-span-4 xl:h-full">
            <TopOpportunities items={data.topOpportunities} total={workspace.openOpportunities} />
          </div>
        </div>

        <StatStrip>
          <Stat
            label="Lucro bruto"
            value={formatCurrency(data.grossProfit.value, { compact: true })}
            delta={<Delta value={relativeChange(data.grossProfit.value, data.grossProfit.previous)} />}
            trend={<Sparkline values={lastPoints.map((p) => p.grossProfit)} />}
          />
          <Stat
            label="Margem bruta"
            value={formatPercent(data.grossMargin.value)}
            delta={<Delta kind="points" value={data.grossMargin.value - data.grossMargin.previous} />}
            trend={<Sparkline values={lastPoints.map((p) => (p.revenue > 0 ? p.grossProfit / p.revenue : 0))} />}
          />
          <Stat
            label="Ticket médio"
            value={formatCurrency(data.averageTicket.value)}
            delta={<Delta value={relativeChange(data.averageTicket.value, data.averageTicket.previous)} />}
            trend={<Sparkline values={lastPoints.map((p) => (p.orders > 0 ? p.revenue / p.orders : 0))} />}
          />
          <Stat
            label="Pedidos"
            value={formatNumber(data.orders.value)}
            delta={<Delta value={relativeChange(data.orders.value, data.orders.previous)} />}
            trend={<Sparkline values={lastPoints.map((p) => p.orders)} />}
          />
        </StatStrip>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <CategoryBreakdown categories={data.categories} />
          </div>
          <div className="flex flex-col gap-6 xl:col-span-5">
            <InventoryHealth inventory={data.inventory} />
            <RecentActivity items={data.activity.slice(0, 4)} />
          </div>
        </div>
      </PeriodFrame>
    </PeriodScope>
  );
}

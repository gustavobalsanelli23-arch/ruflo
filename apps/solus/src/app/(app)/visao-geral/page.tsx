import type { Metadata } from 'next';
import Link from 'next/link';
import { Boxes } from 'lucide-react';
import { Delta } from '@/components/data/delta';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { PeriodFrame, PeriodScope, PeriodSelect } from '@/components/data/period-scope';
import { Sparkline } from '@/components/data/sparkline';
import { Stat, StatStrip } from '@/components/data/stat';
import { EmptyState } from '@/components/data/states';
import { TextLink } from '@/components/data/text-link';
import { Button } from '@/components/ui/button';
import { buildBriefing } from '@/lib/analytics/briefing';
import { formatCurrency, formatNumber, formatPercent, formatRatio, relativeChange } from '@/lib/format';
import { parsePeriod } from '@/lib/period';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Briefing } from '@/modules/overview/briefing';
import { Greeting } from '@/modules/overview/greeting';
import { MarginChart } from '@/modules/overview/margin-chart';
import { Onboarding } from '@/modules/overview/onboarding';
import { CategoryBreakdown, InventoryHealth, RecentActivity, TopOpportunities } from '@/modules/overview/overview-panels';
import { RevenueProfitChart } from '@/modules/overview/revenue-profit-chart';
import { DataNotes } from '@/modules/workspace/data-notes';
import { loadBase, loadOverview } from '@/services/dashboards';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Visão executiva' };

const BUCKET = { day: 'dia', week: 'semana', month: 'mês' } as const;

/**
 * The executive overview of a real organization: the same screen as the
 * demonstration, fed by the metric layer. Without data it is the onboarding
 * checklist; figures that cannot be computed show a dash and say why.
 */
export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const workspace = await requireWorkspace();
  const supabase = await createSupabaseServerClient();
  const base = supabase ? await loadBase(supabase, workspace.active.organizationId) : null;
  if (!supabase || !base) return <Onboarding workspace={workspace} />;

  const key = parsePeriod((await searchParams).periodo);
  const data = await loadOverview(supabase, workspace.active.organizationId, base, key);
  const { current, previous, period } = data;
  const firstName = workspace.user.fullName?.split(' ')[0] ?? workspace.user.displayName;
  const compact = (value: number) => formatCurrency(value, { compact: true });
  const partialCost = current.costCoverage !== null && current.costCoverage < 0.999;
  const notes = [...data.limitations];
  if (partialCost) {
    notes.unshift(
      `${formatPercent(1 - (current.costCoverage ?? 0))} da receita do período não tem custo conhecido: o lucro bruto e a margem consideram só a parte com custo.`,
    );
  }

  return (
    <PeriodScope period={key}>
      <PageHeader title={<Greeting name={firstName} />} description={`Indicadores de ${workspace.active.name}.`} actions={<PeriodSelect />} />

      <PeriodFrame className="mt-6 flex flex-col gap-6">
        <Briefing
          source="metrics"
          dataThrough={base.dataThrough}
          segments={buildBriefing({
            period: key,
            current,
            previous,
            openOpportunities: data.opportunities.summary.open,
            urgentOpportunities: data.opportunities.summary.highPriority,
          })}
        />

        <StatStrip label={`Indicadores, ${period.label.toLowerCase()}`} className="md:grid-cols-3 xl:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <Stat
            className="col-span-2 xl:col-span-1"
            size="xl"
            label={`Receita líquida, ${period.label.toLowerCase()}`}
            value={compact(current.netRevenue)}
            delta={<Delta value={relativeChange(current.netRevenue, previous.netRevenue)} />}
            hint={`contra ${compact(previous.netRevenue)}. Bruta ${compact(current.grossRevenue)}, descontos ${compact(current.discounts)}, devoluções ${compact(current.returns)}`}
          />
          <Stat
            label="Lucro bruto"
            value={compact(current.grossProfit)}
            delta={<Delta size="xs" value={relativeChange(current.grossProfit, previous.grossProfit)} />}
            hint={partialCost ? 'só dos itens com custo conhecido' : `contra ${compact(previous.grossProfit)}`}
            trend={<Sparkline values={data.trend.map((p) => p.grossProfit)} />}
          />
          <Stat
            label="Margem bruta"
            value={formatRatio(current.grossMargin)}
            delta={
              current.grossMargin !== null && previous.grossMargin !== null ? (
                <Delta size="xs" kind="points" value={current.grossMargin - previous.grossMargin} />
              ) : undefined
            }
            hint={current.grossMargin === null ? 'indisponível: sem custo conhecido' : `contra ${formatRatio(previous.grossMargin)}`}
          />
          <Stat
            label="Ticket médio"
            value={current.averageTicket === null ? '—' : formatCurrency(current.averageTicket)}
            delta={
              current.averageTicket !== null && previous.averageTicket !== null ? (
                <Delta size="xs" value={relativeChange(current.averageTicket, previous.averageTicket)} />
              ) : undefined
            }
            hint={current.averageTicket === null ? 'sem número de pedido nas vendas' : 'receita das vendas identificadas ÷ vendas'}
          />
          <Stat
            label="Vendas"
            value={current.orders > 0 ? formatNumber(current.orders) : '—'}
            delta={current.orders > 0 ? <Delta size="xs" value={relativeChange(current.orders, previous.orders)} /> : undefined}
            hint={current.orders > 0 ? `contra ${formatNumber(previous.orders)}` : 'sem número de pedido nas vendas'}
            trend={current.orders > 0 ? <Sparkline values={data.trend.map((p) => p.orders)} /> : undefined}
          />
        </StatStrip>

        <DataNotes notes={notes} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Panel
            className="lg:col-span-8"
            title="Receita e lucro bruto"
            description={`Cada barra é a receita líquida de um ${BUCKET[period.granularity]}: a parte de baixo é o lucro bruto, a de cima é o custo${partialCost ? ' e a receita sem custo conhecido' : ''}.`}
          >
            <RevenueProfitChart period={period} trend={data.trend} />
          </Panel>
          <Panel
            className="lg:col-span-4"
            title="Margem bruta"
            description={`Quanto sobra de cada real vendido (com custo conhecido), por ${BUCKET[period.granularity]}.`}
            footer={<TextLink href="/lucratividade">Margem por produto e fornecedor</TextLink>}
          >
            <MarginChart period={period} trend={data.marginTrend} previousMargin={previous.grossMargin} />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopOpportunities items={data.opportunities.top} summary={data.opportunities.summary} />
          {data.inventory ? (
            <InventoryHealth inventory={data.inventory} />
          ) : (
            <Panel title="Estoque" className="h-full">
              <EmptyState
                icon={Boxes}
                title="Sem posição de estoque"
                description="Importe a posição de estoque para ver cobertura, rupturas e capital parado."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dados">Importar estoque</Link>
                  </Button>
                }
              />
            </Panel>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            {data.categories.length > 0 ? (
              <CategoryBreakdown categories={data.categories} />
            ) : (
              <Panel title="Desempenho por categoria">
                <EmptyState title="Sem vendas no período" description="Escolha outro período ou importe as vendas mais recentes." />
              </Panel>
            )}
          </div>
          <div className="xl:col-span-4">
            {data.activity.length > 0 ? (
              <RecentActivity items={data.activity} />
            ) : (
              <Panel title="Atividade recente">
                <EmptyState title="Nada por aqui ainda" />
              </Panel>
            )}
          </div>
        </div>
      </PeriodFrame>
    </PeriodScope>
  );
}

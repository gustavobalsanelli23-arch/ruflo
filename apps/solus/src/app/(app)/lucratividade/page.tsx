import type { Metadata } from 'next';
import { TriangleAlert } from 'lucide-react';
import { Delta } from '@/components/data/delta';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { PeriodFrame, PeriodScope, PeriodSelect } from '@/components/data/period-scope';
import { Stat, StatStrip } from '@/components/data/stat';
import { EmptyState } from '@/components/data/states';
import { formatCurrency, formatPercent, formatRatio, pluralize, relativeChange } from '@/lib/format';
import { parsePeriod } from '@/lib/period';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CategoryMargins, MarginTrend, ProfitabilityMap } from '@/modules/profit/profit-charts';
import { ProductsTable } from '@/modules/profit/products-table';
import { SupplierPanel } from '@/modules/profit/supplier-panel';
import { DataNotes } from '@/modules/workspace/data-notes';
import { ModuleEmpty } from '@/modules/workspace/module-empty';
import { loadBase, loadProfit } from '@/services/dashboards';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Lucratividade' };

const HEADER = {
  title: 'Lucratividade',
  description: 'Onde o resultado é gerado e onde a margem escapa, por produto, categoria e fornecedor.',
};

export default async function ProfitPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { active } = await requireWorkspace();
  const supabase = await createSupabaseServerClient();
  const base = supabase ? await loadBase(supabase, active.organizationId) : null;
  if (!supabase || !base?.coverage.lastSale) {
    return (
      <>
        <PageHeader {...HEADER} />
        <div className="mt-8">
          <ModuleEmpty module="profit" />
        </div>
      </>
    );
  }

  const key = parsePeriod((await searchParams).periodo);
  const data = await loadProfit(supabase, active.organizationId, base, key);
  const { current, previous, params } = data;
  const threshold = params.minMargin;
  const compact = (value: number) => formatCurrency(value, { compact: true });
  const low = data.products.filter((p) => p.band === 'low').length;
  const negative = data.products.filter((p) => p.band === 'negative').length;
  const notes: string[] = [];
  if (current.costCoverage !== null && current.costCoverage < 0.999) {
    notes.push(
      `${formatPercent(1 - current.costCoverage)} da receita não tem custo conhecido (produtos sem custo no arquivo de vendas nem no cadastro). Lucro e margem consideram só a parte com custo; esses produtos aparecem como "Sem custo".`,
    );
  }
  if (data.productsTruncated) notes.push(`A lista mostra os ${data.products.length} produtos de maior receita do período.`);

  return (
    <PeriodScope period={key}>
      <PageHeader {...HEADER} actions={<PeriodSelect />} />

      <PeriodFrame className="mt-8 flex flex-col gap-6">
        <StatStrip label={`Resultado, ${data.period.label.toLowerCase()}`} className="md:grid-cols-3 xl:grid-cols-5">
          <Stat
            label="Receita líquida"
            value={compact(current.netRevenue)}
            delta={<Delta size="xs" value={relativeChange(current.netRevenue, previous.netRevenue)} />}
            hint={`bruta ${compact(current.grossRevenue)} − descontos ${compact(current.discounts)} − devoluções ${compact(current.returns)}`}
          />
          <Stat
            label="Custo das mercadorias (CMV)"
            value={compact(current.cogs)}
            delta={<Delta size="xs" goodWhen="down" value={relativeChange(current.cogs, previous.cogs)} />}
            hint="custo histórico gravado em cada venda"
          />
          <Stat
            label="Lucro bruto"
            value={compact(current.grossProfit)}
            delta={<Delta size="xs" value={relativeChange(current.grossProfit, previous.grossProfit)} />}
            hint="não é lucro líquido: impostos e despesas não entram"
          />
          <Stat
            label="Margem bruta"
            value={formatRatio(current.grossMargin)}
            delta={
              current.grossMargin !== null && previous.grossMargin !== null ? (
                <Delta size="xs" kind="points" value={current.grossMargin - previous.grossMargin} />
              ) : undefined
            }
            hint={`contra ${formatRatio(previous.grossMargin)}`}
          />
          <Stat
            className="col-span-2 md:col-span-2 xl:col-span-1"
            label={
              <span className="inline-flex items-center gap-1.5">
                <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" />
                Margem em alerta
              </span>
            }
            value={pluralize(low + negative, 'produto', 'produtos')}
            hint={`${pluralize(negative, 'vendido', 'vendidos')} abaixo do custo, ${low} abaixo de ${formatPercent(threshold, 0)}`}
          />
        </StatStrip>

        <DataNotes notes={notes} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Panel className="xl:col-span-7" title="Mapa de rentabilidade" description="Cada ponto é um produto: quanto vende e quanto sobra de cada real vendido.">
            <ProfitabilityMap products={data.products} threshold={threshold} />
          </Panel>
          <Panel className="xl:col-span-5" title="Margem por categoria" description="Quanto sobra de cada real vendido em cada categoria.">
            <CategoryMargins categories={data.categories} threshold={threshold} />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Panel className="xl:col-span-7" title="Evolução da margem" description="Margem bruta mensal contra o mesmo mês do ano anterior, quando há histórico.">
            {data.marginPoints.length > 1 ? (
              <MarginTrend points={data.marginPoints} />
            ) : (
              <EmptyState title="Histórico curto" description="A evolução mensal aparece a partir de dois meses de vendas com custo." />
            )}
          </Panel>
          <div className="xl:col-span-5">
            <SupplierPanel suppliers={data.suppliers} threshold={threshold} />
          </div>
        </div>

        <Panel id="produtos" title="Produtos" description="Receita líquida, custo e lucro bruto de cada item. Sem custo conhecido, a margem não é calculada.">
          <ProductsTable products={data.products} threshold={threshold} />
        </Panel>

        <p className="text-xs text-subtle-foreground">
          Lucro bruto = receita líquida − custo das mercadorias vendidas (custo gravado no momento de cada venda). Não inclui impostos sobre a venda (quando
          não descontados no preço), frete, comissões e despesas fixas: não é o lucro líquido da empresa.
        </p>
      </PeriodFrame>
    </PeriodScope>
  );
}

import type { Metadata } from 'next';
import { Delta } from '@/components/data/delta';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { PeriodFrame, PeriodScope, PeriodSelect } from '@/components/data/period-scope';
import { Stat, StatStrip } from '@/components/data/stat';
import { getRepository } from '@/lib/data';
import { formatCurrency, formatPercent, relativeChange } from '@/lib/format';
import { parsePeriod } from '@/lib/period';
import { CategoryMargins, MarginTrend, ProfitabilityMap } from '@/modules/profit/profit-charts';
import { ProductsTable } from '@/modules/profit/products-table';
import { SupplierPanel } from '@/modules/profit/supplier-panel';

export const metadata: Metadata = { title: 'Lucratividade' };

export default async function ProfitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const period = parsePeriod((await searchParams).periodo);
  const data = await getRepository().getProfitAnalytics(period);
  const threshold = data.lowMarginThreshold;

  return (
    <PeriodScope period={period}>
      <PageHeader
        title="Lucratividade"
        description="Onde o resultado é gerado e onde a margem escapa, por produto, categoria e fornecedor."
        actions={<PeriodSelect />}
      />

      <PeriodFrame className="mt-8 flex flex-col gap-6">
        <StatStrip>
          <Stat
            label="Lucro bruto"
            size="lg"
            value={formatCurrency(data.grossProfit.value, { compact: true })}
            delta={<Delta value={relativeChange(data.grossProfit.value, data.grossProfit.previous)} />}
            hint={`Receita de ${formatCurrency(data.revenue.value, { compact: true })}`}
          />
          <Stat
            label="Margem bruta"
            size="lg"
            value={formatPercent(data.grossMargin.value)}
            delta={<Delta kind="points" value={data.grossMargin.value - data.grossMargin.previous} />}
            hint={`Anterior: ${formatPercent(data.grossMargin.previous)}`}
          />
          <Stat
            label={`Itens com margem abaixo de ${formatPercent(threshold, 0)}`}
            size="lg"
            value={<span className="text-warning-text">{data.lowMarginCount}</span>}
            hint="Vendem bem, deixam pouco por unidade"
          />
          <Stat
            label="Itens com margem negativa"
            size="lg"
            value={<span className="text-critical-text">{data.negativeMarginCount}</span>}
            hint="Vendidos abaixo do custo"
          />
        </StatStrip>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Panel
            className="xl:col-span-7"
            title="Mapa de rentabilidade"
            description="Cada ponto é um produto: quanto vende e quanto sobra de cada real vendido."
          >
            <ProfitabilityMap products={data.products} threshold={threshold} />
          </Panel>
          <Panel className="xl:col-span-5" title="Margem por categoria" description={`A linha tracejada marca o corte de ${formatPercent(threshold, 0)}.`}>
            <CategoryMargins categories={data.categories} threshold={threshold} />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Panel
            className="xl:col-span-7"
            title="Evolução da margem"
            description="Margem bruta mensal contra o mesmo mês do ano anterior. A queda a partir de agosto coincide com os reajustes de custo."
          >
            <MarginTrend points={data.marginTrend} />
          </Panel>
          <div className="xl:col-span-5">
            <SupplierPanel suppliers={data.suppliers} threshold={threshold} />
          </div>
        </div>

        <Panel title="Produtos" description="Ordene por qualquer coluna. Margem com variação em pontos percentuais contra o período anterior.">
          <ProductsTable products={data.products} threshold={threshold} />
        </Panel>
      </PeriodFrame>
    </PeriodScope>
  );
}

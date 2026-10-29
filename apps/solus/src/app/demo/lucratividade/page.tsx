import type { Metadata } from 'next';
import { TriangleAlert } from 'lucide-react';
import { Delta } from '@/components/data/delta';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { PeriodFrame, PeriodScope, PeriodSelect } from '@/components/data/period-scope';
import { Stat, StatStrip } from '@/components/data/stat';
import { demoRepository } from '@/demo/repository';
import { formatCurrency, formatPercent, pluralize, relativeChange } from '@/lib/format';
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
  const data = await demoRepository.getProfitAnalytics(period);
  const threshold = data.lowMarginThreshold;
  const compact = (value: number) => formatCurrency(value, { compact: true });
  const cost = { value: data.revenue.value - data.grossProfit.value, previous: data.revenue.previous - data.grossProfit.previous };

  return (
    <PeriodScope period={period}>
      <PageHeader
        title="Lucratividade"
        description="Onde o resultado é gerado e onde a margem escapa, por produto, categoria e fornecedor."
        actions={<PeriodSelect />}
      />

      <PeriodFrame className="mt-8 flex flex-col gap-6">
        <StatStrip label={`Resultado, ${data.period.label.toLowerCase()}`} className="md:grid-cols-3 xl:grid-cols-5">
          <Stat
            label="Receita"
            value={compact(data.revenue.value)}
            delta={<Delta size="xs" value={relativeChange(data.revenue.value, data.revenue.previous)} />}
            hint={`contra ${compact(data.revenue.previous)}`}
          />
          <Stat
            label="Custo das mercadorias"
            value={compact(cost.value)}
            delta={<Delta size="xs" goodWhen="down" value={relativeChange(cost.value, cost.previous)} />}
            hint={`contra ${compact(cost.previous)}`}
          />
          <Stat
            label="Lucro bruto"
            value={compact(data.grossProfit.value)}
            delta={<Delta size="xs" value={relativeChange(data.grossProfit.value, data.grossProfit.previous)} />}
            hint={`contra ${compact(data.grossProfit.previous)}`}
          />
          <Stat
            label="Margem bruta"
            value={formatPercent(data.grossMargin.value)}
            delta={<Delta size="xs" kind="points" value={data.grossMargin.value - data.grossMargin.previous} />}
            hint={`contra ${formatPercent(data.grossMargin.previous)}`}
          />
          <Stat
            className="col-span-2 md:col-span-2 xl:col-span-1"
            label={
              <span className="inline-flex items-center gap-1.5">
                <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" />
                Margem em alerta
              </span>
            }
            value={pluralize(data.lowMarginCount + data.negativeMarginCount, 'produto', 'produtos')}
            hint={`${pluralize(data.negativeMarginCount, 'vendido', 'vendidos')} abaixo do custo, ${data.lowMarginCount} abaixo de ${formatPercent(threshold, 0)}`}
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
          <Panel className="xl:col-span-5" title="Margem por categoria" description="Quanto sobra de cada real vendido em cada categoria.">
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

        <Panel
          id="produtos"
          title="Produtos"
          description="Receita, custo e lucro bruto de cada item. A variação da margem aparece quando passa de 0,1 ponto percentual."
        >
          <ProductsTable products={data.products} threshold={threshold} />
        </Panel>
      </PeriodFrame>
    </PeriodScope>
  );
}

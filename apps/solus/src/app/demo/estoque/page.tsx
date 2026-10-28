import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CalendarDays, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { Stat, StatStrip } from '@/components/data/stat';
import { demoRepository } from '@/demo/repository';
import { formatCurrency, formatDate, formatDays, formatDecimal, formatPercent, pluralize } from '@/lib/format';
import { CoverageChart } from '@/modules/inventory/coverage-chart';
import { InventorySignals } from '@/modules/inventory/signals';
import { StockByCategory } from '@/modules/inventory/stock-by-category';
import { StockTable } from '@/modules/inventory/stock-table';

export const metadata: Metadata = { title: 'Estoque' };

export default async function InventoryPage() {
  const data = await demoRepository.getInventory();
  const immobilizedShare = data.stockValue > 0 ? data.immobilizedValue / data.stockValue : 0;
  const attention = data.ruptureRiskCount + data.stalledCount + data.lowTurnoverCount;

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Quanto dinheiro está na prateleira, quanto tempo ele dura e onde ficou parado."
        actions={
          <span className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4" />
            <span>
              Posição de <time dateTime={data.asOf}>{formatDate(data.asOf)}</time>
            </span>
          </span>
        }
      />

      <div className="mt-8 flex flex-col gap-6">
        <StatStrip label="Posição do estoque" className="md:grid-cols-3 xl:grid-cols-5">
          <Stat label="Valor em estoque" value={formatCurrency(data.stockValue, { compact: true })} hint="A preço de custo" />
          <Stat
            label="Capital imobilizado"
            value={formatCurrency(data.immobilizedValue, { compact: true })}
            hint={`${formatPercent(immobilizedShare, 0)} do estoque, parado ou acima de 90 dias`}
          />
          <Stat label="Cobertura média" value={formatDays(data.averageCoverageDays)} hint="Estoque sobre o custo vendido por dia" />
          <Stat label="Giro anual" value={`${formatDecimal(data.annualTurnover)}×`} hint="Custo vendido em 12 meses sobre o estoque" />
          <Stat
            className="col-span-2 md:col-span-2 xl:col-span-1"
            label={
              <span className="inline-flex items-center gap-1.5">
                <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" />
                Itens em alerta
              </span>
            }
            value={pluralize(attention, 'item', 'itens')}
            hint={`${data.ruptureRiskCount} em ruptura, ${data.stalledCount} parados, ${data.lowTurnoverCount} de baixo giro`}
          />
        </StatStrip>

        <InventorySignals items={data.products} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Panel
            className="xl:col-span-7"
            title="Estoque por categoria"
            description="Onde está o dinheiro da prateleira e quanto tempo ele dura no ritmo atual de venda."
          >
            <StockByCategory products={data.products} />
          </Panel>
          <Panel
            className="xl:col-span-5"
            title="Cobertura do estoque"
            description="Valor a custo por faixa de dias que o estoque dura, no ritmo de venda dos últimos 30 dias."
          >
            <CoverageChart buckets={data.coverage} />
          </Panel>
        </div>

        <Panel id="itens" title="Itens" description="Comece pelos que precisam de atenção. A barra de cobertura vai até 120 dias.">
          <Suspense>
            <StockTable items={data.products} />
          </Suspense>
        </Panel>
      </div>
    </>
  );
}

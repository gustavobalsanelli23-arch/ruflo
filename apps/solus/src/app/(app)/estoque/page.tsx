import type { Metadata } from 'next';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { Stat, StatStrip } from '@/components/data/stat';
import { getRepository } from '@/lib/data';
import { formatCurrency, formatDate, formatDays, formatDecimal, formatPercent } from '@/lib/format';
import { CoverageChart } from '@/modules/inventory/coverage-chart';
import { InventorySignals } from '@/modules/inventory/signals';
import { StockTable } from '@/modules/inventory/stock-table';

export const metadata: Metadata = { title: 'Estoque' };

export default async function InventoryPage() {
  const data = await getRepository().getInventory();
  const immobilizedShare = data.stockValue > 0 ? data.immobilizedValue / data.stockValue : 0;

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
        <StatStrip>
          <Stat label="Valor em estoque" size="lg" value={formatCurrency(data.stockValue, { compact: true })} hint="A preço de custo" />
          <Stat
            label="Capital imobilizado"
            size="lg"
            value={<span className="text-warning-text">{formatCurrency(data.immobilizedValue, { compact: true })}</span>}
            hint={`${formatPercent(immobilizedShare, 0)} do estoque, parado ou acima de 90 dias`}
          />
          <Stat label="Cobertura média" size="lg" value={formatDays(data.averageCoverageDays)} hint="Estoque dividido pelo custo vendido por dia" />
          <Stat label="Giro anual" size="lg" value={`${formatDecimal(data.annualTurnover)}×`} hint="Custo vendido em 12 meses sobre o estoque" />
        </StatStrip>

        <InventorySignals items={data.products} />

        <Panel
          title="Cobertura do estoque"
          description="Valor a custo por faixa de dias que o estoque atual dura no ritmo de venda dos últimos 30 dias."
        >
          <CoverageChart buckets={data.coverage} />
        </Panel>

        <Panel title="Itens" description="Comece pelos que precisam de atenção. A barra de cobertura vai até 120 dias.">
          <StockTable items={data.products} />
        </Panel>
      </div>
    </>
  );
}

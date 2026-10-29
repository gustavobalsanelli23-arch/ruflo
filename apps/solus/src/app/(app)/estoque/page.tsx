import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CalendarDays, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/data/page-header';
import { Panel } from '@/components/data/panel';
import { Stat, StatStrip } from '@/components/data/stat';
import { formatCurrency, formatDate, formatDays, formatDecimal, formatPercent, pluralize } from '@/lib/format';
import { daysBetween } from '@/lib/period';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CoverageChart } from '@/modules/inventory/coverage-chart';
import { InventorySignals } from '@/modules/inventory/signals';
import { StockByCategory } from '@/modules/inventory/stock-by-category';
import { StockTable } from '@/modules/inventory/stock-table';
import { DataNotes } from '@/modules/workspace/data-notes';
import { ModuleEmpty } from '@/modules/workspace/module-empty';
import { loadBase, loadInventory } from '@/services/dashboards';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Estoque' };

const HEADER = { title: 'Estoque', description: 'Quanto dinheiro está na prateleira, quanto tempo ele dura e onde ficou parado.' };

export default async function InventoryPage() {
  const { active } = await requireWorkspace();
  const supabase = await createSupabaseServerClient();
  const base = supabase ? await loadBase(supabase, active.organizationId) : null;
  const data = supabase && base ? await loadInventory(supabase, active.organizationId, base) : null;
  if (!data) {
    return (
      <>
        <PageHeader {...HEADER} />
        <div className="mt-8">
          <ModuleEmpty module="inventory" />
        </div>
      </>
    );
  }

  const immobilizedShare = data.stockValue > 0 ? data.immobilizedValue / data.stockValue : 0;
  const attention = data.counts.rupture + data.counts.stalled + data.counts.lowTurnover;
  const notes: string[] = [];
  const lag = data.dataThrough ? daysBetween(data.asOf, data.dataThrough) - 1 : 0;
  if (lag > 7) {
    notes.push(`A posição de estoque é de ${formatDate(data.asOf)}, ${formatDays(lag)} antes da última venda importada: vendas posteriores não estão descontadas do estoque.`);
  }
  if (!data.dataThrough) notes.push('Sem vendas importadas: cobertura, giro, itens parados e ruptura não podem ser calculados.');
  if (data.uncostedProducts > 0) notes.push(`${pluralize(data.uncostedProducts, 'item sem custo fica', 'itens sem custo ficam')} fora do valor em estoque.`);
  if (data.counts.insufficient > 0) notes.push(`${pluralize(data.counts.insufficient, 'item tem', 'itens têm')} menos de 14 dias de histórico de vendas: classificação indisponível.`);
  if (data.soldWithoutPosition > 0) notes.push(`${pluralize(data.soldWithoutPosition, 'produto vendido não aparece', 'produtos vendidos não aparecem')} na posição de estoque.`);
  if (data.itemsTruncated) notes.push(`A tabela mostra os ${data.items.length} itens que mais pedem atenção; totais e gráficos consideram todos.`);

  return (
    <>
      <PageHeader
        {...HEADER}
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
            hint={`${formatPercent(immobilizedShare, 0)} do estoque, parado ou de baixo giro`}
          />
          <Stat
            label="Cobertura média"
            value={data.averageCoverageDays === null ? '—' : formatDays(data.averageCoverageDays)}
            hint="Estoque sobre o custo vendido por dia"
          />
          <Stat
            label="Giro anual"
            value={data.annualTurnover === null ? '—' : `${formatDecimal(data.annualTurnover)}×`}
            hint="Custo vendido anualizado sobre o estoque"
          />
          <Stat
            className="col-span-2 md:col-span-2 xl:col-span-1"
            label={
              <span className="inline-flex items-center gap-1.5">
                <TriangleAlert aria-hidden="true" className="size-3.5 text-warning-text" />
                Itens em alerta
              </span>
            }
            value={pluralize(attention, 'item', 'itens')}
            hint={`${data.counts.rupture} em ruptura ou risco, ${data.counts.stalled} parados, ${data.counts.lowTurnover} de baixo giro`}
          />
        </StatStrip>

        <DataNotes notes={notes} />

        <InventorySignals items={data.items} stalledDays={data.params.stalledDays} lowTurnoverDays={data.params.lowTurnoverDays} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Panel className="xl:col-span-7" title="Estoque por categoria" description="Onde está o dinheiro da prateleira e quanto tempo ele dura no ritmo atual de venda.">
            <StockByCategory rows={data.byCategory} />
          </Panel>
          <Panel
            className="xl:col-span-5"
            title="Cobertura do estoque"
            description={`Valor a custo por faixa de dias que o estoque dura, no ritmo de venda dos últimos ${data.params.velocityWindowDays} dias.`}
          >
            <CoverageChart buckets={data.coverage} />
          </Panel>
        </div>

        <Panel id="itens" title="Itens" description="Comece pelos que precisam de atenção. A barra de cobertura vai até 120 dias.">
          <Suspense>
            <StockTable items={data.items} />
          </Suspense>
        </Panel>
      </div>
    </>
  );
}

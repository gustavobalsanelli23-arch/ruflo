import { formatCurrency, formatDate, formatNumber, formatPercent, formatPoints, formatRatio, formatSignedPercent, relativeChange } from '@/lib/format';
import type { Opportunity } from '@/lib/data/types';
import { PrintButton } from './print-button';
import type { Figure, ReportData } from './report-data';
import styles from './report.module.css';

/**
 * The monthly report: one A4 page (two at most) an accountant can hand to a
 * client, or an owner keep. Black type on white in print whatever the screen
 * theme; "Baixar PDF" uses the browser's own print-to-PDF.
 */

const PRIORITY: Record<Opportunity['priority'], string> = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
const IMPACT: Record<Opportunity['impactKind'], string> = { monthly: 'por mês', 'one-off': 'uma vez', capital: 'em estoque' };

const plural = (count: number, one: string, many: string) => `${formatNumber(count)} ${count === 1 ? one : many}`;

function change(figure: Figure, kind: 'relative' | 'points') {
  if (figure.value === null || figure.previous === null) return null;
  if (kind === 'points') return formatPoints(figure.value - figure.previous);
  const ratio = relativeChange(figure.value, figure.previous);
  return ratio === null ? null : formatSignedPercent(ratio);
}

function Kpi({ label, figure, format, kind = 'relative' }: { label: string; figure: Figure; format: (value: number) => string; kind?: 'relative' | 'points' }) {
  const delta = change(figure, kind);
  return (
    <div className={styles.kpi}>
      <dt>{label}</dt>
      <dd className={styles.kpiValue}>{figure.value === null ? '—' : format(figure.value)}</dd>
      <dd className={styles.kpiDelta}>
        {delta ? `${delta} contra ${figure.previous === null ? '—' : format(figure.previous)}` : 'sem comparação'}
      </dd>
    </div>
  );
}

export function MonthlyReport({ data, generatedAt }: { data: ReportData; generatedAt: string }) {
  const { period, opportunities, inventory } = data;
  return (
    <article className={styles.report}>
      <div className={styles.toolbar}>
        <p>Confira e use “Baixar PDF” para salvar ou imprimir. O relatório sai em branco e preto, em formato A4.</p>
        <PrintButton />
      </div>

      <header className={styles.head}>
        <p className={styles.brand} translate="no">
          SOLUS
        </p>
        <h1 className={styles.title}>{data.organization}</h1>
        <p className={styles.meta}>
          Relatório de {period.label.toLowerCase()}: {formatDate(period.start)} a {formatDate(period.end)}. Comparado com {formatDate(period.previousStart)} a{' '}
          {formatDate(period.previousEnd)}.
        </p>
      </header>

      <section aria-labelledby="r-indicadores">
        <h2 id="r-indicadores" className={styles.section}>
          Indicadores
        </h2>
        <dl className={styles.kpis}>
          <Kpi label="Receita líquida" figure={data.revenue} format={(value) => formatCurrency(value, { whole: true })} />
          <Kpi label="Lucro bruto" figure={data.grossProfit} format={(value) => formatCurrency(value, { whole: true })} />
          <Kpi label="Margem bruta" figure={data.grossMargin} format={(value) => formatRatio(value)} kind="points" />
          <Kpi label="Ticket médio" figure={data.averageTicket} format={(value) => formatCurrency(value)} />
          <Kpi label="Vendas" figure={data.orders} format={(value) => formatNumber(value)} />
        </dl>
      </section>

      <section aria-labelledby="r-oportunidades">
        <h2 id="r-oportunidades" className={styles.section}>
          Oportunidades abertas
        </h2>
        <p className={styles.lede}>
          {opportunities.summary.open === 0
            ? 'Nenhuma oportunidade aberta no momento.'
            : `${formatNumber(opportunities.summary.open)} abertas, ${formatNumber(opportunities.summary.highPriority)} de alta prioridade. Impacto estimado de ${formatCurrency(opportunities.summary.monthlyImpact, { whole: true })} por mês, se as premissas de cada uma se confirmarem.`}
        </p>
        {opportunities.top.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Oportunidade</th>
                <th scope="col">Prioridade</th>
                <th scope="col" className={styles.num}>
                  Impacto estimado
                </th>
              </tr>
            </thead>
            <tbody>
              {opportunities.top.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{PRIORITY[item.priority]}</td>
                  <td className={styles.num}>
                    {formatCurrency(item.impact, { whole: true })} {IMPACT[item.impactKind]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {data.categories.length > 0 && (
        <section aria-labelledby="r-categorias">
          <h2 id="r-categorias" className={styles.section}>
            Categorias
          </h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col" className={styles.num}>
                  Receita
                </th>
                <th scope="col" className={styles.num}>
                  Participação
                </th>
                <th scope="col" className={styles.num}>
                  Lucro bruto
                </th>
                <th scope="col" className={styles.num}>
                  Margem
                </th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((category) => (
                <tr key={category.categoryId}>
                  <td>{category.name}</td>
                  <td className={styles.num}>{formatCurrency(category.revenue, { whole: true })}</td>
                  <td className={styles.num}>{formatPercent(category.share)}</td>
                  <td className={styles.num}>{formatCurrency(category.grossProfit, { whole: true })}</td>
                  <td className={styles.num}>{formatRatio(category.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {inventory && (
        <section aria-labelledby="r-estoque">
          <h2 id="r-estoque" className={styles.section}>
            Estoque
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>Valor em estoque</dt>
              <dd>{formatCurrency(inventory.stockValue, { whole: true })}</dd>
            </div>
            <div>
              <dt>Parado (sem giro)</dt>
              <dd>
                {formatCurrency(inventory.stalledValue, { whole: true })} em {plural(inventory.stalledCount, 'item', 'itens')}
              </dd>
            </div>
            <div>
              <dt>Risco de faltar</dt>
              <dd>{plural(inventory.ruptureRiskCount, 'item', 'itens')}</dd>
            </div>
            <div>
              <dt>Cobertura média</dt>
              <dd>{plural(Math.round(inventory.averageCoverageDays), 'dia', 'dias')}</dd>
            </div>
          </dl>
          {inventory.ruptureItems.length > 0 && (
            <p className={styles.lede}>
              Mais urgentes:{' '}
              {inventory.ruptureItems
                .slice(0, 5)
                .map((item) => `${item.name} (${plural(Math.round(item.coverageDays), 'dia', 'dias')} de estoque, entrega em ${plural(item.leadTimeDays, 'dia', 'dias')})`)
                .join('; ')}
              .
            </p>
          )}
        </section>
      )}

      <footer className={styles.foot}>
        {data.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <p>
          Todos os números vêm das planilhas importadas no SOLUS. As oportunidades são estimativas, não ganhos garantidos. Gerado em {generatedAt}.
        </p>
      </footer>
    </article>
  );
}

import type { Opportunity } from '@/lib/data/types';
import {
  formatCurrency,
  formatDate,
  formatDay,
  formatDays,
  formatDecimal,
  formatMonth,
  formatNumber,
  formatPercent,
  formatPoints,
  formatSignedPercent,
  relativeChange,
} from '@/lib/format';
import type { InventoryPosition, PeriodTotals, ProductMetrics, StockStatus } from '@/lib/intelligence/types';
import { addDays, buckets } from '@/lib/period';
import { resolveRange, type PeriodInput, type ResolvedPeriod } from './periods';
import type { AnalystDataSource, SourceContext, TableColumn, ToolOutput } from './types';

/**
 * The data tools. Every number comes from the data source (the metric
 * layer); these functions only filter, sort, compare two values the source
 * returned and format them. Results carry raw values (for the model and for
 * the grounding check) and formatted ones (for display).
 */

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const pct = (ratio: number | null) => (ratio === null ? null : round(ratio * 100, 1));
const money = (value: number) => round(value, 2);
const ratioText = (ratio: number | null) => (ratio === null ? '—' : formatPercent(ratio));
const changeText = (value: number, previous: number) => {
  const change = relativeChange(value, previous);
  return change === null ? 'sem base' : formatSignedPercent(change);
};

export type Failure = { error: string };
type Result = ToolOutput | Failure;

function period(input: PeriodInput, context: SourceContext): ResolvedPeriod | Failure {
  return resolveRange(input, context);
}

const periodData = (p: ResolvedPeriod) => ({
  inicio: p.current.start,
  fim: p.current.end,
  dias: p.days,
  descricao: p.label,
  anterior: { inicio: p.previous.start, fim: p.previous.end },
});

/* ---------- resumo_periodo ---------- */

const METRICS: { id: string; label: string; kind: 'money' | 'ratio' | 'count'; better: 'up' | 'down'; read: (t: PeriodTotals) => number | null }[] = [
  { id: 'receita_liquida', label: 'Receita líquida', kind: 'money', better: 'up', read: (t) => t.netRevenue },
  { id: 'receita_bruta', label: 'Receita bruta', kind: 'money', better: 'up', read: (t) => t.grossRevenue },
  { id: 'descontos', label: 'Descontos', kind: 'money', better: 'down', read: (t) => t.discounts },
  { id: 'devolucoes', label: 'Devoluções', kind: 'money', better: 'down', read: (t) => t.returns },
  { id: 'cmv', label: 'CMV', kind: 'money', better: 'down', read: (t) => t.cogs },
  { id: 'lucro_bruto', label: 'Lucro bruto', kind: 'money', better: 'up', read: (t) => t.grossProfit },
  { id: 'margem_bruta', label: 'Margem bruta', kind: 'ratio', better: 'up', read: (t) => t.grossMargin },
  { id: 'cobertura_custo', label: 'Receita com custo conhecido', kind: 'ratio', better: 'up', read: (t) => t.costCoverage },
  { id: 'vendas', label: 'Número de vendas', kind: 'count', better: 'up', read: (t) => (t.orders > 0 ? t.orders : null) },
  { id: 'ticket_medio', label: 'Ticket médio', kind: 'money', better: 'up', read: (t) => t.averageTicket },
  { id: 'unidades', label: 'Unidades vendidas', kind: 'count', better: 'up', read: (t) => t.unitsSold },
];

const display = (kind: 'money' | 'ratio' | 'count', value: number | null) =>
  value === null ? '—' : kind === 'money' ? formatCurrency(value) : kind === 'ratio' ? formatPercent(value) : formatNumber(value);
const raw = (kind: 'money' | 'ratio' | 'count', value: number | null) => (value === null ? null : kind === 'ratio' ? pct(value) : round(value));

export async function periodSummary(source: AnalystDataSource, context: SourceContext, input: PeriodInput, ref: string): Promise<Result> {
  const p = period(input, context);
  if ('error' in p) return p;
  const [now, before] = await Promise.all([source.totals(p.current), source.totals(p.previous)]);
  const rows = METRICS.map((metric) => {
    const value = metric.read(now);
    const previous = metric.read(before);
    let change: number | null = null;
    let changeLabel = 'sem base';
    if (value !== null && previous !== null) {
      if (metric.kind === 'ratio') {
        change = round((value - previous) * 100, 1);
        changeLabel = formatPoints(value - previous);
      } else {
        const relative = relativeChange(value, previous);
        change = relative === null ? null : pct(relative);
        changeLabel = relative === null ? 'sem base' : formatSignedPercent(relative);
      }
    }
    return { metric, value, previous, change, changeLabel };
  });
  const limitations: string[] = [];
  if (now.saleLines === 0) limitations.push('Nenhuma venda no período.');
  if (now.costCoverage !== null && now.costCoverage < 0.999) {
    limitations.push(`Margem e lucro calculados sobre ${formatPercent(now.costCoverage)} da receita (a parte com custo conhecido).`);
  }
  if (now.orders === 0 && now.saleLines > 0) limitations.push('Vendas sem número de pedido: número de vendas e ticket médio indisponíveis.');
  return {
    ref,
    tool: 'resumo_periodo',
    source: { name: 'Totais do período', detail: p.label },
    data: {
      ref,
      periodo: periodData(p),
      metricas: rows.map(({ metric, value, previous, change, changeLabel }) => ({
        id: metric.id,
        rotulo: metric.label,
        valor: raw(metric.kind, value),
        valor_formatado: display(metric.kind, value),
        anterior: raw(metric.kind, previous),
        anterior_formatado: display(metric.kind, previous),
        variacao: change,
        variacao_formatada: changeLabel,
        unidade_variacao: metric.kind === 'ratio' ? 'pontos percentuais' : 'percentual',
      })),
      observacao: 'Lucro bruto = receita com custo conhecido − CMV. Não inclui impostos, frete nem despesas.',
      limitacoes: limitations,
    },
    metrics: rows.map(({ metric, value, change, changeLabel }) => ({
      id: metric.id,
      label: metric.label,
      value: display(metric.kind, value),
      delta: change === null ? undefined : `${changeLabel} vs. anterior`,
      tone: change === null || change === 0 ? undefined : (change > 0) === (metric.better === 'up') ? 'positive' : 'negative',
    })),
  };
}

/* ---------- evolucao ---------- */

export async function evolution(source: AnalystDataSource, context: SourceContext, input: PeriodInput & { granularidade: 'dia' | 'semana' | 'mes' | null }, ref: string): Promise<Result> {
  const p = period(input, context);
  if ('error' in p) return p;
  const granularity = input.granularidade === 'dia' ? 'day' : input.granularidade === 'semana' ? 'week' : input.granularidade === 'mes' ? 'month' : p.granularity;
  if (granularity === 'day' && p.days > 92) return { error: 'Série diária limitada a 92 dias; use semana ou mês.' };
  const days = await source.daily({ start: p.previous.start, end: p.current.end });
  const byDay = new Map(days.map((day) => [day.day, day]));
  const offset = p.days;
  const sum = (start: string, end: string) => {
    const total = { revenue: 0, costed: 0, profit: 0 };
    for (let d = start; d <= end; d = shift(d, 1)) {
      const point = byDay.get(d);
      if (!point) continue;
      total.revenue += point.netRevenue;
      total.costed += point.costedNetRevenue;
      total.profit += point.grossProfit;
    }
    return total;
  };
  const points = buckets(p.current.start, p.current.end, granularity).map((bucket) => {
    const now = sum(bucket.start, bucket.end);
    const before = sum(shift(bucket.start, -offset), shift(bucket.end, -offset));
    const margin = now.costed > 0 ? now.profit / now.costed : null;
    return {
      inicio: bucket.start,
      fim: bucket.end,
      rotulo: granularity === 'month' ? formatMonth(bucket.start) : formatDay(bucket.start),
      receita_liquida: money(now.revenue),
      receita_liquida_anterior: money(before.revenue),
      lucro_bruto: money(now.profit),
      margem_bruta_pct: pct(margin),
      margin,
    };
  });
  return {
    ref,
    tool: 'evolucao',
    source: { name: 'Evolução das vendas', detail: `${p.label}, por ${granularity === 'day' ? 'dia' : granularity === 'week' ? 'semana' : 'mês'}` },
    data: {
      ref,
      periodo: periodData(p),
      granularidade: granularity === 'day' ? 'dia' : granularity === 'week' ? 'semana' : 'mes',
      series_disponiveis: ['receita_liquida', 'lucro_bruto', 'margem_bruta'],
      pontos: points.map((point) => ({
        inicio: point.inicio,
        fim: point.fim,
        rotulo: point.rotulo,
        receita_liquida: point.receita_liquida,
        receita_liquida_anterior: point.receita_liquida_anterior,
        lucro_bruto: point.lucro_bruto,
        margem_bruta_pct: point.margem_bruta_pct,
      })),
    },
    series: points.map((point) => ({
      label: point.rotulo,
      values: { receita_liquida: point.receita_liquida, lucro_bruto: point.lucro_bruto, margem_bruta: point.margin },
    })),
  };
}

const shift = addDays;

/* ---------- produtos ---------- */

export type ProductSort = 'receita_liquida' | 'lucro_bruto' | 'margem_bruta' | 'unidades' | 'desconto' | 'variacao_receita';

const PRODUCT_COLUMNS: TableColumn[] = [
  { key: 'produto', label: 'Produto' },
  { key: 'sku', label: 'SKU' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'receita_liquida', label: 'Receita líquida', align: 'right' },
  { key: 'variacao_receita', label: 'Variação', align: 'right' },
  { key: 'lucro_bruto', label: 'Lucro bruto', align: 'right' },
  { key: 'margem_bruta', label: 'Margem', align: 'right' },
  { key: 'unidades', label: 'Unidades', align: 'right' },
  { key: 'desconto', label: 'Desconto', align: 'right' },
  { key: 'custo_conhecido', label: 'Receita com custo', align: 'right' },
];

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function productRanking(
  source: AnalystDataSource,
  context: SourceContext,
  input: PeriodInput & { ordenar_por: ProductSort; ordem: 'maior' | 'menor'; limite: number; categoria: string | null; fornecedor: string | null; busca: string | null },
  ref: string,
): Promise<Result> {
  const p = period(input, context);
  if ('error' in p) return p;
  const [current, previous] = await Promise.all([source.products(p.current), source.products(p.previous)]);
  const before = new Map(previous.map((product) => [product.productId, product]));
  const contains = (value: string | null, query: string | null) => !query || (value !== null && normalize(value).includes(normalize(query)));
  let rows = current.filter(
    (product) =>
      contains(product.categoryName ?? 'Sem categoria', input.categoria) &&
      contains(product.supplierName ?? 'Sem fornecedor', input.fornecedor) &&
      (!input.busca || contains(product.name, input.busca) || contains(product.sku, input.busca)),
  );
  const key = (product: ProductMetrics): number | null => {
    switch (input.ordenar_por) {
      case 'lucro_bruto':
        return (product.costCoverage ?? 0) > 0 ? product.grossProfit : null;
      case 'margem_bruta':
        return product.grossMargin;
      case 'unidades':
        return product.unitsSold;
      case 'desconto':
        return product.discountRate;
      case 'variacao_receita': {
        const past = before.get(product.productId);
        return past ? relativeChange(product.netRevenue, past.netRevenue) : null;
      }
      default:
        return product.netRevenue;
    }
  };
  const total = rows.length;
  rows = rows
    .filter((product) => key(product) !== null)
    .sort((a, b) => (input.ordem === 'menor' ? key(a)! - key(b)! : key(b)! - key(a)!) || a.sku.localeCompare(b.sku))
    .slice(0, Math.min(Math.max(Math.trunc(input.limite) || 10, 1), 20));

  const items = rows.map((product) => {
    const past = before.get(product.productId);
    const change = past ? relativeChange(product.netRevenue, past.netRevenue) : null;
    return {
      product,
      data: {
        produto_id: product.productId,
        produto: product.name,
        sku: product.sku,
        categoria: product.categoryName ?? 'Sem categoria',
        fornecedor: product.supplierName ?? 'Sem fornecedor',
        receita_liquida: money(product.netRevenue),
        receita_liquida_anterior: past ? money(past.netRevenue) : null,
        variacao_receita_pct: pct(change),
        lucro_bruto: money(product.grossProfit),
        margem_bruta_pct: pct(product.grossMargin),
        margem_bruta_anterior_pct: past ? pct(past.grossMargin) : null,
        unidades: round(product.unitsSold),
        desconto_pct: pct(product.discountRate),
        receita_com_custo_pct: pct(product.costCoverage),
        preco_medio: product.averagePrice === null ? null : money(product.averagePrice),
        custo_medio: product.averageCost === null ? null : money(product.averageCost),
        dias_com_venda: product.saleDays,
      },
      row: {
        produto: product.name,
        sku: product.sku,
        categoria: product.categoryName ?? 'Sem categoria',
        fornecedor: product.supplierName ?? 'Sem fornecedor',
        receita_liquida: formatCurrency(product.netRevenue),
        variacao_receita: past ? changeText(product.netRevenue, past.netRevenue) : 'sem base',
        lucro_bruto: (product.costCoverage ?? 0) > 0 ? formatCurrency(product.grossProfit) : 'sem custo',
        margem_bruta: ratioText(product.grossMargin),
        unidades: formatDecimalOrInteger(product.unitsSold),
        desconto: ratioText(product.discountRate),
        custo_conhecido: ratioText(product.costCoverage),
      },
    };
  });
  const filters = [input.categoria && `categoria "${input.categoria}"`, input.fornecedor && `fornecedor "${input.fornecedor}"`, input.busca && `busca "${input.busca}"`]
    .filter(Boolean)
    .join(', ');
  return {
    ref,
    tool: 'produtos',
    source: { name: 'Métricas por produto', detail: `${p.label}${filters ? `; ${filters}` : ''}` },
    data: {
      ref,
      periodo: periodData(p),
      ordenado_por: input.ordenar_por,
      ordem: input.ordem,
      produtos_encontrados: total,
      produtos: items.map((item) => item.data),
      colunas_da_tabela: PRODUCT_COLUMNS.map((column) => column.key),
    },
    table: { columns: PRODUCT_COLUMNS, rows: items.map((item) => item.row) },
  };
}

const formatDecimalOrInteger = (value: number) => (Number.isInteger(value) ? formatNumber(value) : formatDecimal(value));

/* ---------- grupos ---------- */

const GROUP_COLUMNS: TableColumn[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'produtos', label: 'Produtos', align: 'right' },
  { key: 'receita_liquida', label: 'Receita líquida', align: 'right' },
  { key: 'variacao_receita', label: 'Variação', align: 'right' },
  { key: 'participacao', label: 'Participação', align: 'right' },
  { key: 'lucro_bruto', label: 'Lucro bruto', align: 'right' },
  { key: 'margem_bruta', label: 'Margem', align: 'right' },
];

export async function groupSummary(source: AnalystDataSource, context: SourceContext, input: PeriodInput & { agrupar_por: 'categoria' | 'fornecedor' }, ref: string): Promise<Result> {
  const p = period(input, context);
  if ('error' in p) return p;
  const kind = input.agrupar_por === 'fornecedor' ? 'supplier' : 'category';
  const empty = kind === 'supplier' ? 'Sem fornecedor' : 'Sem categoria';
  const [current, previous] = await Promise.all([source.groups(kind, p.current), source.groups(kind, p.previous)]);
  const before = new Map(previous.map((group) => [group.id ?? empty, group]));
  const totalRevenue = current.reduce((sum, group) => sum + group.netRevenue, 0);
  const rows = [...current].sort((a, b) => b.netRevenue - a.netRevenue).slice(0, 30);
  return {
    ref,
    tool: 'grupos',
    source: { name: kind === 'supplier' ? 'Métricas por fornecedor' : 'Métricas por categoria', detail: p.label },
    data: {
      ref,
      periodo: periodData(p),
      agrupado_por: input.agrupar_por,
      grupos: rows.map((group) => {
        const past = before.get(group.id ?? empty);
        return {
          nome: group.name ?? empty,
          produtos: group.products,
          receita_liquida: money(group.netRevenue),
          receita_liquida_anterior: past ? money(past.netRevenue) : null,
          variacao_receita_pct: past ? pct(relativeChange(group.netRevenue, past.netRevenue)) : null,
          participacao_pct: totalRevenue > 0 ? pct(group.netRevenue / totalRevenue) : null,
          lucro_bruto: money(group.grossProfit),
          margem_bruta_pct: pct(group.grossMargin),
          margem_bruta_anterior_pct: past ? pct(past.grossMargin) : null,
          unidades: round(group.unitsSold),
        };
      }),
      colunas_da_tabela: GROUP_COLUMNS.map((column) => column.key),
    },
    table: {
      columns: GROUP_COLUMNS,
      rows: rows.map((group) => {
        const past = before.get(group.id ?? empty);
        return {
          nome: group.name ?? empty,
          produtos: formatNumber(group.products),
          receita_liquida: formatCurrency(group.netRevenue),
          variacao_receita: past ? changeText(group.netRevenue, past.netRevenue) : 'sem base',
          participacao: totalRevenue > 0 ? formatPercent(group.netRevenue / totalRevenue) : '—',
          lucro_bruto: formatCurrency(group.grossProfit),
          margem_bruta: ratioText(group.grossMargin),
        };
      }),
    },
  };
}

/* ---------- estoque ---------- */

export const STOCK_LABEL: Record<StockStatus, string> = {
  rupture: 'Ruptura',
  'rupture-risk': 'Risco de ruptura',
  stalled: 'Parado',
  'low-turnover': 'Giro baixo',
  'medium-turnover': 'Giro médio',
  'high-turnover': 'Giro alto',
  'no-stock': 'Sem estoque e sem venda',
  'insufficient-data': 'Dados insuficientes',
};
const STOCK_KEYS = Object.keys(STOCK_LABEL) as StockStatus[];

const STOCK_COLUMNS: TableColumn[] = [
  { key: 'produto', label: 'Produto' },
  { key: 'sku', label: 'SKU' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'situacao', label: 'Situação' },
  { key: 'estoque', label: 'Estoque', align: 'right' },
  { key: 'capital', label: 'Capital', align: 'right' },
  { key: 'venda_media_dia', label: 'Venda/dia', align: 'right' },
  { key: 'cobertura', label: 'Cobertura', align: 'right' },
  { key: 'dias_sem_venda', label: 'Sem venda há', align: 'right' },
  { key: 'prazo_reposicao', label: 'Reposição', align: 'right' },
];

export async function stockQuery(
  source: AnalystDataSource,
  input: { situacoes: StockStatus[]; categoria: string | null; ordenar_por: 'capital' | 'cobertura' | 'dias_sem_venda'; ordem: 'maior' | 'menor'; limite: number },
  ref: string,
): Promise<Result> {
  const stock = await source.stock();
  if (!stock) return { error: 'Não há posição de estoque importada.' };
  const wanted = new Set(input.situacoes.filter((status) => STOCK_KEYS.includes(status)));
  const byStatus = STOCK_KEYS.map((status) => {
    const items = stock.positions.filter((position) => position.status === status);
    return { situacao: status, rotulo: STOCK_LABEL[status], itens: items.length, capital: money(items.reduce((sum, item) => sum + (item.stockValue ?? 0), 0)) };
  }).filter((group) => group.itens > 0);
  const key = (position: InventoryPosition): number | null =>
    input.ordenar_por === 'cobertura' ? position.coverageDays : input.ordenar_por === 'dias_sem_venda' ? position.daysSinceLastSale : position.stockValue;
  const total = stock.positions.filter(
    (position) => (wanted.size === 0 || wanted.has(position.status)) && (!input.categoria || normalize(position.categoryName ?? 'Sem categoria').includes(normalize(input.categoria))),
  );
  const rows = total
    .filter((position) => key(position) !== null)
    .sort((a, b) => (input.ordem === 'menor' ? key(a)! - key(b)! : key(b)! - key(a)!) || a.sku.localeCompare(b.sku))
    .slice(0, Math.min(Math.max(Math.trunc(input.limite) || 10, 1), 20));
  return {
    ref,
    tool: 'estoque',
    source: { name: 'Posição de estoque', detail: `Posição de ${formatDate(stock.asOf)}` },
    data: {
      ref,
      data_posicao: stock.asOf,
      capital_total: money(stock.stockValue),
      giro_anual: stock.annualTurnover === null ? null : round(stock.annualTurnover, 1),
      por_situacao: byStatus,
      itens_encontrados: total.length,
      itens: rows.map((position) => ({
        produto: position.name,
        sku: position.sku,
        categoria: position.categoryName ?? 'Sem categoria',
        situacao: STOCK_LABEL[position.status],
        estoque: round(position.onHand),
        capital: position.stockValue === null ? null : money(position.stockValue),
        venda_media_dia: position.avgDailyUnits === null ? null : round(position.avgDailyUnits),
        cobertura_dias: position.coverageDays === null ? null : round(position.coverageDays, 0),
        dias_sem_venda: position.daysSinceLastSale,
        ultima_venda: position.lastSaleDate,
        prazo_reposicao_dias: position.leadTimeDays,
      })),
      observacao: 'Capital em estoque é dinheiro imobilizado, não lucro.',
      colunas_da_tabela: STOCK_COLUMNS.map((column) => column.key),
    },
    table: {
      columns: STOCK_COLUMNS,
      rows: rows.map((position) => ({
        produto: position.name,
        sku: position.sku,
        categoria: position.categoryName ?? 'Sem categoria',
        situacao: STOCK_LABEL[position.status],
        estoque: formatDecimalOrInteger(position.onHand),
        capital: position.stockValue === null ? 'sem custo' : formatCurrency(position.stockValue),
        venda_media_dia: position.avgDailyUnits === null ? '—' : formatDecimal(position.avgDailyUnits),
        cobertura: position.coverageDays === null ? 'sem venda' : formatDays(position.coverageDays),
        dias_sem_venda: position.daysSinceLastSale === null ? '—' : formatDays(position.daysSinceLastSale),
        prazo_reposicao: formatDays(position.leadTimeDays),
      })),
    },
  };
}

/* ---------- oportunidades ---------- */

const PRIORITY: Record<Opportunity['priority'], string> = { critical: 'crítica', high: 'alta', medium: 'média', low: 'baixa' };
const STATUS: Record<Opportunity['status'], string> = { new: 'nova', reviewing: 'em análise', 'in-progress': 'em andamento', done: 'concluída', dismissed: 'descartada' };
const KIND: Record<Opportunity['impactKind'], string> = {
  monthly: 'lucro bruto por mês (estimativa)',
  'one-off': 'lucro bruto pontual (estimativa)',
  capital: 'capital em estoque (não é lucro)',
};
const OPEN = new Set<Opportunity['status']>(['new', 'reviewing', 'in-progress']);

const OPPORTUNITY_COLUMNS: TableColumn[] = [
  { key: 'titulo', label: 'Oportunidade' },
  { key: 'prioridade', label: 'Prioridade' },
  { key: 'impacto', label: 'Impacto', align: 'right' },
  { key: 'confianca', label: 'Confiança', align: 'right' },
  { key: 'status', label: 'Status' },
];

export async function opportunityQuery(source: AnalystDataSource, input: { situacao: 'abertas' | 'todas'; id: string | null }, ref: string): Promise<Result> {
  const all = await source.opportunities();
  const items = input.id ? all.filter((item) => item.id === input.id) : all.filter((item) => input.situacao === 'todas' || OPEN.has(item.status)).slice(0, 15);
  if (input.id && items.length === 0) return { error: 'Oportunidade não encontrada nesta organização.' };
  const detail = Boolean(input.id);
  return {
    ref,
    tool: 'oportunidades',
    source: { name: 'Central de Oportunidades', detail: detail ? (items[0]?.title ?? '') : input.situacao === 'abertas' ? 'Oportunidades abertas' : 'Todas as oportunidades' },
    data: {
      ref,
      total: items.length,
      oportunidades: items.map((item) => ({
        id: item.id,
        titulo: item.title,
        resumo: item.summary,
        prioridade: PRIORITY[item.priority],
        confianca_pct: pct(item.confidence),
        impacto: money(item.impact),
        impacto_formatado: formatCurrency(item.impact),
        tipo_de_impacto: KIND[item.impactKind],
        metodo_do_impacto: item.assumptions,
        status: STATUS[item.status],
        detectada_em: item.detectedAt,
        ...(detail
          ? {
              fatos: item.evidence.map((evidence) => ({ rotulo: evidence.label, valor: evidence.value, fonte: evidence.detail ?? null })),
              hipoteses: item.hypotheses ?? [],
              recomendacoes: item.recommendation,
              por_que_importa: item.whyItMatters,
            }
          : {}),
      })),
      observacao: 'Impactos são estimativas com premissas; capital em estoque nunca é somado ao lucro.',
      colunas_da_tabela: OPPORTUNITY_COLUMNS.map((column) => column.key),
    },
    table: {
      columns: OPPORTUNITY_COLUMNS,
      rows: items.map((item) => ({
        titulo: item.title,
        prioridade: PRIORITY[item.priority],
        impacto: `${formatCurrency(item.impact)}${item.impactKind === 'monthly' ? '/mês' : item.impactKind === 'capital' ? ' (capital)' : ''}`,
        confianca: formatPercent(item.confidence, 0),
        status: STATUS[item.status],
      })),
    },
  };
}

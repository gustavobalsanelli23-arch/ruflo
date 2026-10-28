/**
 * DEMONSTRATION DATA — scripted analyst conversations.
 * No language model is called in this phase. Answers are fixed templates
 * filled with the demo dataset so the interface can be evaluated.
 */
import type { AnalystData, AnswerBlock, AnalystThread } from '@/lib/data/types';
import { formatCurrency, formatDay, formatDays, formatMonth, formatPercent, formatPoints, formatSignedPercent } from '@/lib/format';
import { addDays, endOfMonth, resolvePeriod } from '@/lib/period';
import { DEMO_TODAY, categories, costOn, products } from './catalog';
import { inventory, margin, marginTrend, productProfit } from './metrics';
import { storeTotals } from './sales';

function frozenDairyMargin(): AnswerBlock[] {
  const ids = products.filter((p) => p.categoryId === 'frios').map((p) => p.id);
  const boaVista = products.filter((p) => p.supplierId === 'boa-vista');
  const before = storeTotals('2026-06-01', '2026-08-14', ids);
  const after = storeTotals('2026-08-15', DEMO_TODAY, ids);
  const mBefore = margin(before.revenue, before.cost);
  const mAfter = margin(after.revenue, after.cost);
  const months = marginTrend(DEMO_TODAY)
    .slice(-6)
    .map((m) => {
      const t = storeTotals(m.date, endOfMonth(m.date, DEMO_TODAY), ids);
      return { date: m.date, margin: margin(t.revenue, t.cost) };
    });
  return [
    {
      kind: 'summary',
      text: `A margem de frios e laticínios caiu de ${formatPercent(mBefore)} para ${formatPercent(mAfter)} depois de 15 de agosto. A causa principal é o reajuste de 9% da Laticínios Boa Vista, que não foi repassado ao preço.`,
    },
    {
      kind: 'metrics',
      items: [
        { label: 'Margem antes', value: formatPercent(mBefore) },
        { label: 'Margem depois', value: formatPercent(mAfter), delta: formatPoints(mAfter - mBefore), tone: 'negative' },
        { label: 'Itens afetados', value: String(boaVista.length) },
      ],
    },
    {
      kind: 'chart',
      title: 'Margem bruta de frios e laticínios por mês',
      unit: 'percent',
      points: months.map((m) => ({ label: formatMonth(m.date), value: m.margin })),
    },
    {
      kind: 'table',
      title: 'Itens da Laticínios Boa Vista',
      columns: [
        { key: 'name', label: 'Produto' },
        { key: 'before', label: 'Custo até 14 ago', align: 'right' },
        { key: 'now', label: 'Custo atual', align: 'right' },
        { key: 'price', label: 'Preço', align: 'right' },
        { key: 'margin', label: 'Margem atual', align: 'right' },
      ],
      rows: boaVista.map((p) => {
        const now = costOn(p, DEMO_TODAY);
        return {
          name: p.name,
          before: formatCurrency(p.cost),
          now: formatCurrency(now),
          price: formatCurrency(p.price),
          margin: formatPercent(margin(p.price, now)),
        };
      }),
      note: 'Preços de venda sem alteração desde junho.',
    },
    {
      kind: 'findings',
      facts: [
        'O custo unitário dos 5 itens da Boa Vista subiu 9,0% nas notas a partir de 15 ago.',
        'Os preços de venda desses itens não mudaram no período.',
        'O volume vendido de canastra e parmesão continuou crescendo.',
      ],
      hypotheses: [
        'A demanda por queijos curados parece pouco sensível a preço; um repasse parcial deve ter pouco efeito no volume.',
      ],
    },
    {
      kind: 'recommendation',
      items: [
        'Pedir ao fornecedor a justificativa do reajuste e propor 4% com contrato de volume.',
        'Cotar canastra e parmesão com um segundo fornecedor para ter referência de preço.',
        'Se o custo se mantiver, repassar parte do reajuste nos queijos curados.',
      ],
    },
    {
      kind: 'sources',
      items: [
        { name: 'Vendas por item', detail: '1 jun a 26 out 2026, 5 SKUs' },
        { name: 'Custos de compra', detail: 'Notas fiscais da Laticínios Boa Vista' },
      ],
    },
    { kind: 'next', items: ['Quais produtos mais contribuem para o lucro?', 'Onde está o dinheiro parado no estoque?'] },
  ];
}

function profitLeaders(): AnswerBlock[] {
  const period = resolvePeriod('30d', DEMO_TODAY);
  const ranked = productProfit(period);
  const total = ranked.reduce((sum, p) => sum + p.grossProfit, 0);
  const top = ranked.slice(0, 5);
  const topShare = top.reduce((sum, p) => sum + p.grossProfit, 0) / total;
  return [
    {
      kind: 'summary',
      text: `Cinco produtos geram ${formatPercent(topShare, 0)} do lucro bruto dos últimos 30 dias. A padaria lidera: o pão de fermentação natural sozinho rende ${formatCurrency(top[0]?.grossProfit ?? 0, { whole: true })}.`,
    },
    {
      kind: 'metrics',
      items: [
        { label: 'Lucro bruto em 30 dias', value: formatCurrency(total, { compact: true }) },
        { label: 'Parte dos 5 primeiros', value: formatPercent(topShare, 0) },
        { label: 'Produtos vendidos', value: String(ranked.filter((p) => p.unitsSold > 0).length) },
      ],
    },
    {
      kind: 'chart',
      title: 'Lucro bruto por produto, últimos 30 dias',
      unit: 'currency',
      points: top.map((p) => ({ label: p.name, value: p.grossProfit })),
    },
    {
      kind: 'table',
      title: 'Os 5 produtos que mais geram lucro',
      columns: [
        { key: 'name', label: 'Produto' },
        { key: 'revenue', label: 'Receita', align: 'right' },
        { key: 'profit', label: 'Lucro bruto', align: 'right' },
        { key: 'margin', label: 'Margem', align: 'right' },
        { key: 'share', label: 'Parte do lucro', align: 'right' },
      ],
      rows: top.map((p) => ({
        name: p.name,
        revenue: formatCurrency(p.revenue, { whole: true }),
        profit: formatCurrency(p.grossProfit, { whole: true }),
        margin: formatPercent(p.margin ?? 0),
        share: formatPercent(p.grossProfit / total),
      })),
    },
    {
      kind: 'findings',
      facts: top.map((p) => `${p.name}: margem de ${formatPercent(p.margin ?? 0)} e ${p.unitsSold} unidades.`),
      hypotheses: ['Itens de padaria podem estar puxando visitas que geram compras em outras categorias; isso exige dados de cesta para confirmar.'],
    },
    {
      kind: 'recommendation',
      items: [
        'Acompanhar a cobertura de estoque desses cinco itens toda semana: faltar um deles custa mais que qualquer outra ruptura.',
        'Evitar descontos na padaria, que já vende bem com margem acima de 55%.',
      ],
    },
    { kind: 'sources', items: [{ name: 'Vendas por item', detail: `${formatDay(period.start)} a ${formatDay(period.end)}, 44 SKUs` }] },
    { kind: 'next', items: ['Por que a margem de frios caiu nos últimos meses?'] },
  ];
}

function idleCapital(): AnswerBlock[] {
  const inv = inventory();
  const idle = inv.products.filter((p) => p.status === 'stalled' || p.status === 'low-turnover').sort((a, b) => b.stockValue - a.stockValue);
  return [
    {
      kind: 'summary',
      text: `Há ${formatCurrency(inv.immobilizedValue, { whole: true })} em estoque parado ou acima de 90 dias de cobertura, ${formatPercent(inv.immobilizedValue / inv.stockValue, 0)} do estoque total. A maior parte está em vinhos importados sem venda desde julho.`,
    },
    {
      kind: 'metrics',
      items: [
        { label: 'Estoque a custo', value: formatCurrency(inv.stockValue, { whole: true }) },
        { label: 'Capital imobilizado', value: formatCurrency(inv.immobilizedValue, { whole: true }), tone: 'negative' },
        { label: 'Itens envolvidos', value: String(idle.length) },
      ],
    },
    {
      kind: 'table',
      title: 'Onde o dinheiro está parado',
      columns: [
        { key: 'name', label: 'Produto' },
        { key: 'value', label: 'Valor a custo', align: 'right' },
        { key: 'coverage', label: 'Cobertura', align: 'right' },
        { key: 'last', label: 'Última venda', align: 'right' },
      ],
      rows: idle.map((p) => ({
        name: p.name,
        value: formatCurrency(p.stockValue, { whole: true }),
        coverage: p.coverageDays === null ? 'Sem venda' : formatDays(p.coverageDays),
        last: p.daysSinceLastSale === 0 ? 'Hoje' : `há ${formatDays(p.daysSinceLastSale ?? 0)}`,
      })),
    },
    {
      kind: 'findings',
      facts: idle.map((p) => `${p.name}: ${formatCurrency(p.stockValue, { whole: true })} em estoque.`),
      hypotheses: ['Kits de fim de ano devem escoar os vinhos sem desconto agressivo, dado o pico de dezembro em anos anteriores.'],
    },
    {
      kind: 'recommendation',
      items: [
        'Montar kits de fim de ano com os vinhos parados e queijos curados.',
        'Suspender os próximos pedidos dos itens de baixo giro até a cobertura voltar a 60 dias.',
      ],
    },
    { kind: 'sources', items: [{ name: 'Posição de estoque', detail: `Fechamento de ${formatDay(DEMO_TODAY)}` }, { name: 'Vendas por item', detail: 'Últimos 365 dias' }] },
    { kind: 'next', items: ['Como está outubro em relação a setembro?'] },
  ];
}

function monthOverMonth(): AnswerBlock[] {
  const oct = storeTotals('2026-10-01', DEMO_TODAY);
  const sep = storeTotals('2026-09-01', '2026-09-26');
  const change = oct.revenue / sep.revenue - 1;
  const byCategory = categories
    .map((category) => {
      const ids = products.filter((p) => p.categoryId === category.id).map((p) => p.id);
      const now = storeTotals('2026-10-01', DEMO_TODAY, ids).revenue;
      const before = storeTotals('2026-09-01', '2026-09-26', ids).revenue;
      return { name: category.name, now, before, change: before > 0 ? now / before - 1 : 0 };
    })
    .sort((a, b) => b.now - a.now);
  return [
    {
      kind: 'summary',
      text: `Até o dia 26, outubro faturou ${formatCurrency(oct.revenue, { whole: true })}, ${formatSignedPercent(change)} em relação aos mesmos dias de setembro. A margem bruta ficou praticamente estável.`,
    },
    {
      kind: 'metrics',
      items: [
        { label: 'Receita out (1 a 26)', value: formatCurrency(oct.revenue, { compact: true }) },
        { label: 'Receita set (1 a 26)', value: formatCurrency(sep.revenue, { compact: true }) },
        { label: 'Margem out', value: formatPercent(margin(oct.revenue, oct.cost)), delta: formatPoints(margin(oct.revenue, oct.cost) - margin(sep.revenue, sep.cost)) },
      ],
    },
    {
      kind: 'table',
      title: 'Receita por categoria, dias 1 a 26',
      columns: [
        { key: 'name', label: 'Categoria' },
        { key: 'before', label: 'Setembro', align: 'right' },
        { key: 'now', label: 'Outubro', align: 'right' },
        { key: 'change', label: 'Variação', align: 'right' },
      ],
      rows: byCategory.map((c) => ({
        name: c.name,
        before: formatCurrency(c.before, { whole: true }),
        now: formatCurrency(c.now, { whole: true }),
        change: formatSignedPercent(c.change),
      })),
    },
    {
      kind: 'findings',
      facts: ['A comparação usa os mesmos 26 dias de cada mês para não favorecer o mês mais longo.'],
      hypotheses: ['O fim de semana prolongado de 12 de outubro pode explicar parte do crescimento.'],
    },
    { kind: 'recommendation', items: ['Repetir a comparação no fechamento, com os 31 dias de outubro contra os 30 de setembro ajustados por dia útil.'] },
    { kind: 'sources', items: [{ name: 'Vendas diárias', detail: '1 set a 26 out 2026' }] },
  ];
}

const threads: AnalystThread[] = [
  {
    id: 't-frios',
    title: 'Por que a margem de frios caiu?',
    updatedAt: '2026-10-25T17:48:00-03:00',
    messages: [
      { id: 'm1', role: 'user', at: '2026-10-25T17:46:00-03:00', text: 'Por que a margem de frios caiu nos últimos meses?' },
      { id: 'm2', role: 'analyst', at: '2026-10-25T17:46:20-03:00', blocks: frozenDairyMargin() },
    ],
  },
  {
    id: 't-capital',
    title: 'Capital parado em estoque',
    updatedAt: '2026-10-22T10:14:00-03:00',
    messages: [
      { id: 'm3', role: 'user', at: '2026-10-22T10:13:00-03:00', text: 'Onde está o dinheiro parado no estoque?' },
      { id: 'm4', role: 'analyst', at: '2026-10-22T10:13:15-03:00', blocks: idleCapital() },
    ],
  },
  {
    id: 't-outubro',
    title: 'Outubro contra setembro',
    updatedAt: addDays(DEMO_TODAY, -6) + 'T09:02:00-03:00',
    messages: [
      { id: 'm5', role: 'user', at: addDays(DEMO_TODAY, -6) + 'T09:01:00-03:00', text: 'Como está outubro em relação a setembro?' },
      { id: 'm6', role: 'analyst', at: addDays(DEMO_TODAY, -6) + 'T09:01:12-03:00', blocks: monthOverMonth() },
    ],
  },
];

let cache: AnalystData | null = null;

export function analyst(): AnalystData {
  if (!cache) {
    cache = {
      threads,
      suggestions: [
        { id: 'q-lucro', theme: 'Lucratividade', question: 'Quais produtos mais contribuem para o lucro?' },
        { id: 'q-frios', theme: 'Lucratividade', question: 'Por que a margem de frios caiu nos últimos meses?' },
        { id: 'q-capital', theme: 'Estoque', question: 'Onde está o dinheiro parado no estoque?' },
        { id: 'q-mes', theme: 'Desempenho', question: 'Como está outubro em relação a setembro?' },
      ],
      scriptedAnswers: {
        'q-lucro': profitLeaders(),
        'q-frios': frozenDairyMargin(),
        'q-capital': idleCapital(),
        'q-mes': monthOverMonth(),
      },
    };
  }
  return cache;
}

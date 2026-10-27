/**
 * DEMONSTRATION DATA — opportunities derived from the demo dataset.
 * Impacts are computed from the same rows the other screens use, with the
 * assumptions written into each explanation. The real detection engine
 * arrives in a later phase.
 */
import type { Opportunity } from '@/lib/data/types';
import { formatCurrency, formatDays, formatDecimal, formatPercent, formatPoints } from '@/lib/format';
import { addDays, endOfMonth } from '@/lib/period';
import { DEMO_TODAY, costOn, products } from './catalog';
import { LOW_MARGIN_THRESHOLD, margin, marginTrend, productStock } from './metrics';
import { productTotals, storeTotals } from './sales';

const last30 = { start: addDays(DEMO_TODAY, -29), end: DEMO_TODAY };
const byId = (id: string) => {
  const product = products.find((p) => p.id === id);
  if (!product) throw new Error(`Produto de demonstração ausente: ${id}`);
  return product;
};
const totals30 = (id: string) => productTotals(id, last30.start, last30.end);
const round = (value: number, step = 10) => Math.round(value / step) * step;

function monthlyCategoryMargin(categoryId: string) {
  const ids = products.filter((p) => p.categoryId === categoryId).map((p) => p.id);
  return marginTrend(DEMO_TODAY).map((point) => {
    const t = storeTotals(point.date, endOfMonth(point.date, DEMO_TODAY), ids);
    return { date: point.date, value: margin(t.revenue, t.cost) };
  });
}

function boaVistaIncrease(): Opportunity {
  const ids = products.filter((p) => p.supplierId === 'boa-vista').map((p) => p.id);
  const extraCost = ids.reduce((sum, id) => {
    const product = byId(id);
    return sum + totals30(id).units * (costOn(product, DEMO_TODAY) - product.cost);
  }, 0);
  const before = storeTotals('2026-06-01', '2026-08-14', ids);
  const after = storeTotals('2026-08-15', DEMO_TODAY, ids);
  const drop = margin(after.revenue, after.cost) - margin(before.revenue, before.cost);
  return {
    id: 'op-boa-vista',
    title: 'Renegociar o reajuste de 9% da Laticínios Boa Vista',
    category: 'purchasing',
    impact: round(extraCost),
    impactKind: 'monthly',
    priority: 'high',
    confidence: 0.88,
    status: 'new',
    detectedAt: '2026-10-21',
    summary: `Custos de 5 itens subiram 9% em 15 ago sem repasse ao preço. A margem de frios caiu ${formatDecimal(Math.abs(drop) * 100)} pontos percentuais.`,
    explanation:
      'Desde 15 de agosto, todas as notas da Laticínios Boa Vista vêm com custo unitário 9% maior. Os preços de venda não mudaram, então a diferença sai inteira da margem. O impacto considera o volume dos últimos 30 dias.',
    recommendation: [
      'Pedir ao fornecedor a justificativa do reajuste e propor 4% com contrato de volume.',
      'Cotar canastra e parmesão com um segundo fornecedor para ter referência de preço.',
      'Se o custo se mantiver, repassar parte do reajuste nos itens com menor sensibilidade a preço.',
    ],
    evidence: [
      { label: 'Reajuste médio', value: '+9,0%', detail: 'Notas fiscais desde 15 ago' },
      { label: 'Itens afetados', value: '5 de 44', detail: 'Todos de frios e laticínios' },
      { label: 'Margem de frios', value: formatPoints(drop), detail: 'Antes e depois do reajuste' },
      { label: 'Custo extra por mês', value: formatCurrency(extraCost, { whole: true }) },
    ],
    series: { label: 'Margem bruta de Frios e laticínios', unit: 'percent', points: monthlyCategoryMargin('frios') },
    products: ids,
  };
}

function oliveOilBelowCost(): Opportunity {
  const product = byId('p20');
  const t = totals30(product.id);
  const cost = costOn(product, DEMO_TODAY);
  const target = 69.9;
  const lossToday = t.units * (product.price - cost);
  const withNewPrice = t.units * 0.8 * (target - cost);
  return {
    id: 'op-azeite',
    title: 'Corrigir o preço do azeite português, vendido abaixo do custo',
    category: 'pricing',
    impact: round(withNewPrice - lossToday),
    impactKind: 'monthly',
    priority: 'high',
    confidence: 0.81,
    status: 'reviewing',
    detectedAt: '2026-10-19',
    summary: `Custo de ${formatCurrency(cost)} contra preço de ${formatCurrency(product.price)}. Cada unidade vendida dá prejuízo.`,
    explanation:
      'O custo do Azeite extravirgem português 500 ml passou de R$ 38,00 para R$ 52,40 em 4 de agosto e o preço de prateleira ficou em R$ 49,90. O impacto compara a perda atual com o preço sugerido, assumindo queda de 20% no volume.',
    recommendation: [
      `Reajustar para ${formatCurrency(target)}, o que leva a margem a ${formatPercent(margin(target, cost))}.`,
      'Comunicar o novo preço com a origem do produto na gôndola para sustentar o valor percebido.',
      'Acompanhar o volume por 3 semanas; se cair mais de 30%, avaliar um azeite nacional como alternativa.',
    ],
    evidence: [
      { label: 'Margem atual', value: formatPercent(margin(product.price, cost)), detail: 'Desde 4 ago' },
      { label: 'Unidades em 30 dias', value: String(t.units) },
      { label: 'Perda acumulada no mês', value: formatCurrency(Math.abs(lossToday), { whole: true }) },
      { label: 'Preço sugerido', value: formatCurrency(target) },
    ],
    series: {
      label: 'Margem bruta do azeite',
      unit: 'percent',
      points: marginTrend(DEMO_TODAY).map((point) => {
        const m = productTotals(product.id, point.date, endOfMonth(point.date, DEMO_TODAY));
        return { date: point.date, value: margin(m.revenue, m.cost) };
      }),
    },
    products: [product.id],
  };
}

function lowMarginBeverages(): Opportunity {
  const low = products.filter((p) => {
    const m = margin(p.price, costOn(p, DEMO_TODAY));
    return m >= 0 && m < LOW_MARGIN_THRESHOLD;
  });
  const targetMargin = 0.18;
  const gain = low.reduce((sum, p) => {
    const cost = costOn(p, DEMO_TODAY);
    const newPrice = cost / (1 - targetMargin);
    return sum + totals30(p.id).units * 0.92 * (newPrice - cost) - totals30(p.id).units * (p.price - cost);
  }, 0);
  return {
    id: 'op-margem-baixa',
    title: `Revisar preço de ${low.length} itens com margem abaixo de ${formatPercent(LOW_MARGIN_THRESHOLD, 0)}`,
    category: 'pricing',
    impact: round(gain),
    impactKind: 'monthly',
    priority: 'medium',
    confidence: 0.72,
    status: 'new',
    detectedAt: '2026-10-22',
    summary: 'Refrigerantes, energético e itens de limpeza giram bem, mas deixam menos de R$ 1,50 por unidade.',
    explanation:
      'São produtos de alto giro usados como referência de preço pelo cliente. O cálculo leva cada item a 18% de margem e assume queda de 8% no volume. Vale testar primeiro nos itens com menos concorrência direta.',
    recommendation: [
      'Subir o preço em etapas de até R$ 0,50 e medir o volume semanal.',
      'Manter refrigerante cola como item de entrada, se a comparação com concorrentes exigir.',
      'Negociar bonificação por volume com a Distribuidora Serra Azul.',
    ],
    evidence: low.map((p) => ({
      label: p.name,
      value: formatPercent(margin(p.price, costOn(p, DEMO_TODAY))),
      detail: `${totals30(p.id).units} un. em 30 dias`,
    })),
    products: low.map((p) => p.id),
  };
}

function stalledWines(): Opportunity {
  const stalled = productStock().filter((s) => s.status === 'stalled');
  const value = stalled.reduce((sum, s) => sum + s.stockValue, 0);
  const idle = Math.min(...stalled.map((s) => s.daysSinceLastSale));
  return {
    id: 'op-vinhos-parados',
    title: `Liberar ${formatCurrency(value, { compact: true, whole: true })} parados em vinhos importados`,
    category: 'inventory',
    impact: round(value, 100),
    impactKind: 'one-off',
    priority: 'medium',
    confidence: 0.9,
    status: 'in-progress',
    detectedAt: '2026-10-02',
    summary: `${stalled.length} rótulos sem nenhuma venda há mais de ${formatDays(idle)}.`,
    explanation:
      'O Douro e o rosé Provence pararam de vender em julho, depois que a vitrine de importados foi reorganizada. O valor considera o estoque a custo; é caixa que volta ao negócio, não lucro.',
    recommendation: [
      'Montar kits de fim de ano com queijos curados, que estão em alta.',
      'Voltar os rótulos para a vitrine principal com sugestão de harmonização.',
      'Negociar com a Importadora Atlântica a troca de parte do lote por rótulos de maior giro.',
    ],
    evidence: stalled.map((s) => ({
      label: s.name,
      value: formatCurrency(s.stockValue, { whole: true }),
      detail: `${s.onHand} un., sem venda há ${formatDays(s.daysSinceLastSale)}`,
    })),
    products: stalled.map((s) => s.productId),
  };
}

function coffeeRupture(): Opportunity {
  const stock = productStock().find((s) => s.productId === 'p16');
  const product = byId('p16');
  const coverage = stock?.coverageDays ?? 0;
  const gap = Math.max(0, product.leadTimeDays - coverage);
  const lost = (stock?.dailyUnits ?? 0) * gap * (product.price - costOn(product, DEMO_TODAY));
  return {
    id: 'op-cafe-ruptura',
    title: 'Repor o Café especial Mirante antes de faltar na prateleira',
    category: 'rupture',
    impact: round(lost),
    impactKind: 'one-off',
    priority: 'high',
    confidence: 0.76,
    status: 'new',
    detectedAt: DEMO_TODAY,
    summary: `Estoque cobre ${formatDays(coverage)}; o fornecedor entrega em ${formatDays(product.leadTimeDays)}.`,
    explanation:
      'É o item de maior receita de cafés e cresce 18% ao ano. No ritmo atual, a prateleira esvazia antes da próxima entrega. O impacto estima o lucro bruto perdido nos dias sem produto.',
    recommendation: [
      'Fazer o pedido hoje para não perder vendas no fim de semana.',
      'Subir o ponto de pedido de 20 para 70 unidades.',
      'Combinar com a Torrefação Mirante uma entrega fixa semanal.',
    ],
    evidence: [
      { label: 'Em estoque', value: `${product.onHand} un.` },
      { label: 'Venda média', value: `${formatDecimal(stock?.dailyUnits ?? 0)} un./dia` },
      { label: 'Prazo do fornecedor', value: formatDays(product.leadTimeDays) },
      { label: 'Dias sem produto', value: formatDays(gap) },
    ],
    products: [product.id],
  };
}

function curedCheeseMix(): Opportunity {
  const ids = ['p27', 'p28'];
  const now = storeTotals(addDays(DEMO_TODAY, -89), DEMO_TODAY, ids);
  const before = storeTotals(addDays(DEMO_TODAY, -454), addDays(DEMO_TODAY, -365), ids);
  const growth = before.revenue > 0 ? now.revenue / before.revenue - 1 : 0;
  const profit30 = ids.reduce((sum, id) => sum + totals30(id).revenue - totals30(id).cost, 0);
  return {
    id: 'op-queijos-curados',
    title: 'Ampliar o espaço de queijos curados na geladeira principal',
    category: 'mix',
    impact: round(profit30 * 0.15),
    impactKind: 'monthly',
    priority: 'low',
    confidence: 0.48,
    status: 'new',
    detectedAt: '2026-10-24',
    summary: `Canastra e parmesão cresceram ${formatPercent(growth, 0)} em um ano, com margem acima de 35%.`,
    explanation:
      'A procura cresce mais rápido que o espaço de exposição. A estimativa supõe 15% a mais de volume com o dobro de frentes na geladeira; é uma hipótese a validar com um teste de 4 semanas.',
    recommendation: [
      'Dobrar as frentes de canastra e parmesão por 4 semanas e comparar com o mesmo período anterior.',
      'Liberar o espaço reduzindo frentes de itens com baixo giro da mesma geladeira.',
    ],
    evidence: [
      { label: 'Crescimento em 12 meses', value: formatPercent(growth, 0) },
      { label: 'Lucro bruto em 30 dias', value: formatCurrency(profit30, { whole: true }) },
      { label: 'Ganho de volume suposto', value: '15%', detail: 'Hipótese, não medido' },
    ],
    products: ids,
  };
}

function slowMovers(): Opportunity {
  const slow = productStock().filter((s) => s.status === 'low-turnover');
  const excess = slow.reduce((sum, s) => {
    if (s.coverageDays === null) return sum;
    return sum + s.stockValue * Math.max(0, (s.coverageDays - 60) / s.coverageDays);
  }, 0);
  return {
    id: 'op-baixo-giro',
    title: `Reduzir os pedidos de ${slow.length} itens de baixo giro`,
    category: 'inventory',
    impact: round(excess, 100),
    impactKind: 'one-off',
    priority: 'low',
    confidence: 0.7,
    status: 'reviewing',
    detectedAt: '2026-10-12',
    summary: `${slow.map((s) => s.name).join(' e ')} têm estoque para mais de 4 meses de venda.`,
    explanation:
      'O valor é o estoque acima de 60 dias de cobertura. Não exige promoção: basta pular ou reduzir os próximos pedidos até a cobertura voltar ao alvo.',
    recommendation: [
      'Suspender os próximos pedidos desses itens.',
      'Definir cobertura máxima de 60 dias para destilados e não perecíveis de baixo giro.',
    ],
    evidence: slow.map((s) => ({
      label: s.name,
      value: s.coverageDays === null ? 'Sem venda' : formatDays(s.coverageDays),
      detail: `${formatCurrency(s.stockValue, { whole: true })} em estoque`,
    })),
    products: slow.map((s) => s.productId),
  };
}

function breadReorderDone(): Opportunity {
  return {
    id: 'op-pao-ponto-pedido',
    title: 'Ajustar a produção de pão de fermentação aos sábados',
    category: 'rupture',
    impact: 1240,
    impactKind: 'monthly',
    priority: 'medium',
    confidence: 0.84,
    status: 'done',
    detectedAt: '2026-09-08',
    summary: 'O pão acabava antes das 11h aos sábados. A produção subiu 40% nesse dia.',
    explanation:
      'Concluída em setembro. O valor é o lucro bruto adicional estimado com a produção maior aos sábados.',
    recommendation: ['Manter a produção ajustada e revisar após o fim de ano.'],
    evidence: [{ label: 'Faltas aos sábados', value: '0', detail: 'Últimas 6 semanas' }],
    products: ['p33'],
  };
}

let cache: Opportunity[] | null = null;

export function opportunities(): Opportunity[] {
  if (!cache) {
    cache = [
      boaVistaIncrease(),
      oliveOilBelowCost(),
      coffeeRupture(),
      lowMarginBeverages(),
      stalledWines(),
      curedCheeseMix(),
      slowMovers(),
      breadReorderDone(),
    ];
  }
  return cache;
}

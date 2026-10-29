import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { emptyResult, finish, productLabel, windowSource, type RuleContext, type RuleResult } from '../context';
import { clampConfidence, sampleFactor } from '../scoring';
import type { Fact } from '../types';

/**
 * Queda de desempenho por produto: receita líquida dos últimos 30 dias contra
 * os 30 anteriores. Exige histórico cobrindo os dois períodos, receita
 * anterior relevante (≥ R$ 500 e ≥ 0,5% da receita da empresa no período) e
 * pelo menos 5 dias com venda antes.
 *
 * Fato: a queda. Hipóteses só com base nos dados (estoque zerado, preço
 * maior) e, sempre, as que os dados não podem afastar (sazonalidade,
 * concorrência), identificadas como hipóteses.
 */

const MIN_PREVIOUS_REVENUE = 500;
const MIN_PREVIOUS_SHARE = 0.005;

export function performanceRules(ctx: RuleContext): RuleResult {
  const result = emptyResult();
  const { comparison, params, inventory } = ctx.input;
  if (!comparison) return result;

  const previousTotal = comparison.previousProducts.reduce((sum, product) => sum + product.netRevenue, 0);
  const currentById = new Map(comparison.currentProducts.map((product) => [product.productId, product]));
  const positions = new Map(inventory?.positions.map((position) => [position.productId, position]));
  const currentSource = windowSource('Últimos 30 dias', comparison.current);
  const previousSource = windowSource('30 dias anteriores', comparison.previous);

  for (const previous of comparison.previousProducts) {
    if (previous.netRevenue < Math.max(MIN_PREVIOUS_REVENUE, previousTotal * MIN_PREVIOUS_SHARE) || previous.saleDays < 5) continue;
    const current = currentById.get(previous.productId);
    const currentRevenue = current?.netRevenue ?? 0;
    const change = (currentRevenue - previous.netRevenue) / previous.netRevenue;
    if (change > -params.dropThreshold) continue;

    const profitKnown = (previous.costCoverage ?? 0) >= 0.9 && (!current || (current.costCoverage ?? 0) >= 0.9);
    const profitLoss = profitKnown ? previous.grossProfit - (current?.grossProfit ?? 0) : 0;

    const hypotheses: string[] = [];
    const facts: Fact[] = [
      { label: 'Receita líquida (últimos 30 dias)', value: currentRevenue, format: 'currency', source: currentSource },
      { label: 'Receita líquida (30 dias anteriores)', value: previous.netRevenue, format: 'currency', source: previousSource },
      { label: 'Variação', value: change, format: 'percent', source: currentSource },
      { label: 'Unidades vendidas (últimos 30 dias)', value: current?.unitsSold ?? 0, format: 'number', source: currentSource },
      { label: 'Unidades vendidas (30 dias anteriores)', value: previous.unitsSold, format: 'number', source: previousSource },
    ];
    if (profitKnown) facts.push({ label: 'Lucro bruto perdido no período', value: profitLoss, format: 'currency', source: currentSource });

    const position = positions.get(previous.productId);
    if (position && (position.status === 'rupture' || position.status === 'no-stock')) {
      hypotheses.push(`Estoque zerado na posição de ${formatDate(position.snapshotDate)}: a queda pode ser falta de produto.`);
      facts.push({ label: 'Estoque na última posição', value: position.onHand, format: 'number', source: `Posição de estoque de ${formatDate(position.snapshotDate)}` });
    }
    if (current?.averagePrice && previous.averagePrice && current.averagePrice / previous.averagePrice - 1 >= 0.05) {
      const rise = current.averagePrice / previous.averagePrice - 1;
      hypotheses.push(`O preço médio cobrado subiu ${formatPercent(rise)}: a demanda pode ter reagido ao preço.`);
      facts.push({ label: 'Preço médio cobrado (últimos 30 dias)', value: current.averagePrice, format: 'currency', source: currentSource });
    }
    hypotheses.push('Sazonalidade: compare com o mesmo período do ano anterior, se houver histórico.', 'Concorrência ou mudança de exposição na loja.');

    const draft = finish(ctx, {
      type: 'performance_drop',
      dedupeKey: `performance_drop:product:${previous.productId}`,
      entityType: 'product',
      entityId: previous.productId,
      entityLabel: productLabel(previous),
      title: `Queda de vendas: ${previous.name}`,
      summary: `Receita líquida ${formatPercent(-change)} menor nos últimos 30 dias (${formatCurrency(currentRevenue)}) que nos 30 anteriores (${formatCurrency(previous.netRevenue)}).`,
      confidence: clampConfidence(0.65 * sampleFactor(previous.saleDays)),
      impactValue: Math.max(profitLoss, 0),
      impactKind: 'monthly_profit',
      impactMethod: profitKnown
        ? 'Lucro bruto dos 30 dias anteriores − lucro bruto dos últimos 30 dias. É o lucro mensal a recuperar se o desempenho voltar ao nível anterior.'
        : 'Sem custo confiável: o lucro perdido não foi estimado; a queda de receita está nos fatos.',
      facts,
      hypotheses,
      recommendations: ['Verificar estoque e exposição do produto.', 'Comparar o preço com o da concorrência.', 'Se a queda for sazonal, descartar.'],
      periodStart: comparison.previous.start,
      periodEnd: comparison.current.end,
    });
    if (draft) result.drafts.push(draft);
    else result.discarded++;
  }
  return result;
}

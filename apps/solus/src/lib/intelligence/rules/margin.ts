import { formatCurrency, formatPercent } from '@/lib/format';
import { emptyResult, finish, productLabel, windowSource, type RuleContext, type RuleResult } from '../context';
import { clampConfidence, costSourceFactor, MIN_MONTHLY_IMPACT, monthly, sampleFactor } from '../scoring';
import type { Fact, OpportunityDraft, ProductMetrics } from '../types';

/**
 * Margin family, per product. At most one opportunity per product from this
 * family, in this order: negative margin, low margin, cost not passed on to
 * the price, discounts above the limit. Their impacts overlap (they are all
 * the same margin), so showing more than one would double count.
 *
 * Evidence required for every rule: net revenue > 0 and cost known for at
 * least 90% of the product's revenue (otherwise the margin itself is not
 * reliable and no rule runs for the product).
 */

const MIN_COST_COVERAGE = 0.9;

function costFacts(product: ProductMetrics, source: string): Fact[] {
  const facts: Fact[] = [
    { label: 'Margem bruta', value: product.grossMargin ?? 0, format: 'percent', source },
    { label: 'Lucro bruto', value: product.grossProfit, format: 'currency', source },
    { label: 'Receita líquida', value: product.netRevenue, format: 'currency', source },
    { label: 'CMV (custo histórico das vendas)', value: product.cogs, format: 'currency', source },
  ];
  if (product.averagePrice !== null) facts.push({ label: 'Preço médio cobrado (com desconto)', value: product.averagePrice, format: 'currency', source });
  if (product.averageCost !== null) facts.push({ label: 'Custo médio por unidade', value: product.averageCost, format: 'currency', source });
  if (product.discountRate) facts.push({ label: 'Desconto médio sobre a receita bruta', value: product.discountRate, format: 'percent', source });
  facts.push({ label: 'Dias com venda', value: product.saleDays, format: 'number', source });
  const costed = product.fileCostLines + product.catalogCostLines;
  if (costed > 0 && product.catalogCostLines > 0) {
    facts.push({
      label: 'Linhas com custo do cadastro (não do arquivo de vendas)',
      value: product.catalogCostLines / costed,
      format: 'percent',
      source: 'Origem do custo gravada em cada item de venda',
    });
  }
  return facts;
}

function confidenceOf(base: number, product: ProductMetrics) {
  return clampConfidence(
    base *
      sampleFactor(product.saleDays) *
      costSourceFactor(product.fileCostLines, product.catalogCostLines) *
      (product.catalogComplete ? 1 : 0.9) *
      Math.min(product.costCoverage ?? 0, 1),
  );
}

export function marginRules(ctx: RuleContext): RuleResult {
  const result = emptyResult();
  const { input } = ctx;
  const window = input.window;
  if (!window) return result;

  const source = windowSource('Métricas de vendas', window);
  const currentById = new Map(input.comparison?.currentProducts.map((p) => [p.productId, p]));
  const previousById = new Map(input.comparison?.previousProducts.map((p) => [p.productId, p]));
  let withoutCost = 0;

  for (const product of input.products) {
    if (product.netRevenue <= 0) continue;
    if ((product.costCoverage ?? 0) < MIN_COST_COVERAGE) {
      withoutCost++;
      continue;
    }
    const label = productLabel(product);
    const base = {
      entityType: 'product' as const,
      entityId: product.productId,
      entityLabel: label,
      periodStart: window.start,
      periodEnd: window.end,
    };
    const discountNote =
      product.discountRate !== null && product.discountRate > input.params.maxDiscountRate
        ? `Descontos de ${formatPercent(product.discountRate)} da receita bruta, acima do limite de ${formatPercent(input.params.maxDiscountRate)}.`
        : null;

    const candidates: (() => OpportunityDraft | null | 'skip')[] = [
      // 1. Margem negativa: vendido abaixo do custo.
      () => {
        if (product.grossMargin === null || product.grossMargin >= 0 || product.saleDays < 3) return 'skip';
        const impact = monthly(-product.grossProfit, window.days);
        if (impact < MIN_MONTHLY_IMPACT) return null;
        return finish(ctx, {
          ...base,
          type: 'negative_margin',
          dedupeKey: `negative_margin:product:${product.productId}`,
          title: `Margem negativa em ${product.name}`,
          summary: `Vendido abaixo do custo de ${window.days} dias para cá: prejuízo bruto de ${formatCurrency(-product.grossProfit)} sobre ${formatCurrency(product.netRevenue)} de receita líquida.`,
          confidence: confidenceOf(0.85, product),
          impactValue: impact,
          impactKind: 'monthly_profit',
          impactMethod: 'Prejuízo bruto do período (receita com custo − CMV), em média por 30 dias. É o que se deixa de perder por mês ao vender pelo menos pelo custo, mantido o volume.',
          facts: costFacts(product, source),
          hypotheses: [
            'Preço não atualizado depois de aumento de custo.',
            ...(discountNote ? [discountNote] : []),
            'Custo cadastrado ou importado incorretamente.',
            'Produto vendido abaixo do custo de propósito, para atrair clientes.',
          ],
          recommendations: ['Conferir o custo unitário do produto.', 'Revisar o preço de venda e a política de desconto.', 'Se a venda abaixo do custo for intencional, descartar esta oportunidade.'],
          floor: 'medium',
        });
      },
      // 2. Margem abaixo do mínimo da empresa.
      () => {
        const margin = product.grossMargin;
        if (margin === null || margin < 0 || margin >= input.params.minMargin || product.saleDays < 5) return 'skip';
        const impact = monthly((input.params.minMargin - margin) * product.costedNetRevenue, window.days);
        if (impact < MIN_MONTHLY_IMPACT) return null;
        return finish(ctx, {
          ...base,
          type: 'low_margin',
          dedupeKey: `low_margin:product:${product.productId}`,
          title: `Margem baixa em ${product.name}`,
          summary: `Margem bruta de ${formatPercent(margin)}, abaixo do mínimo de ${formatPercent(input.params.minMargin)} definido para a empresa.`,
          confidence: confidenceOf(0.8, product),
          impactValue: impact,
          impactKind: 'monthly_profit',
          impactMethod: '(margem mínima − margem atual) × receita líquida com custo, em média por 30 dias. Supõe o mesmo volume de vendas com a margem mínima.',
          facts: [...costFacts(product, source), { label: 'Margem mínima definida', value: input.params.minMargin, format: 'percent', source: 'Configurações → Análises' }],
          hypotheses: ['Preço defasado em relação ao custo.', ...(discountNote ? [discountNote] : []), 'Custo de compra acima do praticado por outros fornecedores.'],
          recommendations: ['Revisar o preço de venda.', 'Negociar o custo com o fornecedor.', 'Avaliar se o produto tem papel estratégico (atração, mix) que justifique a margem.'],
        });
      },
      // 3. Custo subiu e o preço não acompanhou (últimos 30 dias × 30 anteriores).
      () => {
        const comparison = input.comparison;
        const current = currentById.get(product.productId);
        const previous = previousById.get(product.productId);
        if (!comparison || !current || !previous) return 'skip';
        if (current.saleDays < 3 || previous.saleDays < 3) return 'skip';
        if ((current.costCoverage ?? 0) < MIN_COST_COVERAGE || (previous.costCoverage ?? 0) < MIN_COST_COVERAGE) return 'skip';
        if (!current.averageCost || !previous.averageCost || !current.averagePrice || !previous.averagePrice) return 'skip';
        if (current.grossMargin === null || previous.grossMargin === null) return 'skip';
        const costChange = current.averageCost / previous.averageCost - 1;
        const priceChange = current.averagePrice / previous.averagePrice - 1;
        const marginDrop = previous.grossMargin - current.grossMargin;
        if (costChange < 0.05 || priceChange >= costChange / 2 || marginDrop < 0.02) return 'skip';
        const impact = monthly(marginDrop * current.costedNetRevenue, comparison.current.days);
        if (impact < MIN_MONTHLY_IMPACT) return null;
        const currentSource = windowSource('Últimos 30 dias', comparison.current);
        const previousSource = windowSource('30 dias anteriores', comparison.previous);
        return finish(ctx, {
          ...base,
          type: 'profitability',
          dedupeKey: `profitability:cost_pass_through:product:${product.productId}`,
          title: `Custo subiu e o preço não acompanhou: ${product.name}`,
          summary: `Custo médio ${formatPercent(costChange)} maior que nos 30 dias anteriores; preço médio ${formatPercent(priceChange)}. A margem caiu de ${formatPercent(previous.grossMargin)} para ${formatPercent(current.grossMargin)}.`,
          confidence: clampConfidence(0.7 * sampleFactor(Math.min(current.saleDays, previous.saleDays)) * costSourceFactor(current.fileCostLines, current.catalogCostLines)),
          impactValue: impact,
          impactKind: 'monthly_profit',
          impactMethod: '(margem anterior − margem atual) × receita líquida com custo dos últimos 30 dias. É o lucro bruto mensal recuperado se a margem voltar ao nível anterior.',
          facts: [
            { label: 'Custo médio por unidade (atual)', value: current.averageCost, format: 'currency', source: currentSource },
            { label: 'Custo médio por unidade (anterior)', value: previous.averageCost, format: 'currency', source: previousSource },
            { label: 'Preço médio cobrado (atual)', value: current.averagePrice, format: 'currency', source: currentSource },
            { label: 'Preço médio cobrado (anterior)', value: previous.averagePrice, format: 'currency', source: previousSource },
            { label: 'Margem bruta (atual)', value: current.grossMargin, format: 'percent', source: currentSource },
            { label: 'Margem bruta (anterior)', value: previous.grossMargin, format: 'percent', source: previousSource },
          ],
          hypotheses: ['Reajuste do fornecedor ainda não repassado ao preço.', 'Mudança de fornecedor ou de lote com custo maior.'],
          recommendations: ['Atualizar o preço de venda.', 'Negociar o reajuste ou buscar outro fornecedor.'],
          periodStart: comparison.previous.start,
          periodEnd: comparison.current.end,
        });
      },
      // 4. Descontos acima do limite da empresa.
      () => {
        const rate = product.discountRate;
        if (rate === null || rate <= input.params.maxDiscountRate || product.saleDays < 5) return 'skip';
        const impact = monthly((rate - input.params.maxDiscountRate) * product.grossRevenue, window.days);
        if (impact < MIN_MONTHLY_IMPACT) return null;
        return finish(ctx, {
          ...base,
          type: 'profitability',
          dedupeKey: `profitability:discount:product:${product.productId}`,
          title: `Descontos acima do limite em ${product.name}`,
          summary: `Descontos somam ${formatPercent(rate)} da receita bruta do produto; o limite definido é ${formatPercent(input.params.maxDiscountRate)}.`,
          confidence: confidenceOf(0.8, product),
          impactValue: impact,
          impactKind: 'monthly_profit',
          impactMethod: '(desconto médio − limite) × receita bruta, em média por 30 dias. Supõe o mesmo volume com descontos no limite.',
          facts: [
            ...costFacts(product, source),
            { label: 'Descontos concedidos', value: product.discounts, format: 'currency', source },
            { label: 'Limite de desconto definido', value: input.params.maxDiscountRate, format: 'percent', source: 'Configurações → Análises' },
          ],
          hypotheses: ['Promoções frequentes ou sem prazo de término.', 'Descontos manuais no caixa.'],
          recommendations: ['Revisar a política de descontos do produto.', 'Medir se o volume vendido justifica o desconto.'],
        });
      },
    ];

    for (const candidate of candidates) {
      const outcome = candidate();
      if (outcome === 'skip') continue;
      if (outcome === null) {
        result.discarded++;
        continue;
      }
      result.drafts.push(outcome);
      break;
    }
  }

  if (withoutCost > 0) {
    result.limitations.push(
      `${withoutCost} ${withoutCost === 1 ? 'produto vendido ficou' : 'produtos vendidos ficaram'} fora das regras de margem por falta de custo em mais de 10% da receita.`,
    );
  }
  return result;
}

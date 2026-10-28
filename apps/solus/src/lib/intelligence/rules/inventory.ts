import { formatCurrency, formatDate, formatDays, formatNumber } from '@/lib/format';
import { daysBetween, emptyResult, finish, productLabel, type RuleContext, type RuleResult } from '../context';
import { clampConfidence, historyFactor, MIN_CAPITAL, raise, snapshotFactor } from '../scoring';
import type { Fact, InventoryPosition } from '../types';

/**
 * Stock rules over public.inventory_position (classification done in SQL):
 *   stalled_stock    item parado com capital ≥ R$ 100 (impacto: capital)
 *   tied_up_capital  cobertura acima do limite de excesso (impacto: capital
 *                    acima da cobertura-alvo)
 *   rupture_risk     sem estoque com vendas, ou cobertura menor que o prazo
 *                    de reposição (impacto: lucro bruto em risco no período
 *                    sem produto)
 * Capital is never added to profit: its impact kind is "capital".
 */

const MAX_RUPTURE_SNAPSHOT_AGE = 30;

function positionFacts(position: InventoryPosition, source: string): Fact[] {
  const facts: Fact[] = [
    { label: 'Estoque na posição', value: position.onHand, format: 'number', source },
    { label: 'Data da posição', value: position.snapshotDate, format: 'date', source },
  ];
  if (position.unitCost !== null) {
    facts.push({
      label: position.costSource === 'file' ? 'Custo unitário (da posição de estoque)' : 'Custo unitário (do cadastro)',
      value: position.unitCost,
      format: 'currency',
      source,
    });
  }
  if (position.stockValue !== null) facts.push({ label: 'Capital em estoque', value: position.stockValue, format: 'currency', source });
  return facts;
}

export function inventoryRules(ctx: RuleContext): RuleResult {
  const result = emptyResult();
  const inventory = ctx.input.inventory;
  if (!inventory) return result;
  const { params, dataThrough } = ctx.input;
  const source = `Posição de estoque e vendas até ${formatDate(inventory.asOf)}`;
  let staleRuptures = 0;
  let uncosted = 0;

  for (const position of inventory.positions) {
    const label = productLabel(position);
    // Idade da posição em relação ao último dia com vendas importadas.
    const stockAge = dataThrough ? Math.max(daysBetween(position.snapshotDate, dataThrough), 0) : 0;
    const base = {
      entityType: 'product' as const,
      entityId: position.productId,
      entityLabel: label,
      periodStart: position.snapshotDate,
      periodEnd: inventory.asOf,
    };

    if (position.status === 'stalled') {
      if (position.stockValue === null) {
        uncosted++;
        continue;
      }
      if (position.stockValue < MIN_CAPITAL) continue;
      const idle =
        position.daysSinceLastSale !== null
          ? `Sem venda há ${formatDays(position.daysSinceLastSale)}`
          : `Sem nenhuma venda nos ${formatDays(position.historyDays ?? 0)} de histórico`;
      const draft = finish(ctx, {
        ...base,
        type: 'stalled_stock',
        dedupeKey: `stalled_stock:product:${position.productId}`,
        title: `Estoque parado: ${position.name}`,
        summary: `${idle}, com ${formatCurrency(position.stockValue)} imobilizados em ${formatNumber(position.onHand)} unidades.`,
        confidence: clampConfidence(0.85 * snapshotFactor(stockAge) * ((position.historyDays ?? 0) >= params.stalledDays * 2 ? 1 : 0.9)),
        impactValue: position.stockValue,
        impactKind: 'capital',
        impactMethod: 'Capital parado: quantidade em estoque × custo unitário. É dinheiro imobilizado, não lucro; liberá-lo pode exigir desconto.',
        facts: [
          ...positionFacts(position, source),
          position.daysSinceLastSale !== null
            ? { label: 'Dias desde a última venda', value: position.daysSinceLastSale, format: 'days', source }
            : { label: 'Dias de histórico sem venda', value: position.historyDays ?? 0, format: 'days', source },
          { label: 'Limite para item parado', value: params.stalledDays, format: 'days', source: 'Configurações → Análises' },
        ],
        hypotheses: [
          'Produto descontinuado ou fora de temporada.',
          'Exposição ruim na loja ou preço acima do mercado.',
          'Diferença entre o estoque do sistema e o físico.',
          ...(position.perishable ? ['Produto perecível: risco de perda total.'] : []),
        ],
        recommendations: ['Conferir se o estoque existe fisicamente.', 'Fazer promoção ou negociar devolução ao fornecedor.', 'Suspender novas compras do item.'],
        adjust: position.perishable ? (priority) => raise(priority) : undefined,
      });
      if (draft) result.drafts.push(draft);
      else result.discarded++;
      continue;
    }

    if (
      (position.status === 'low-turnover' || position.status === 'medium-turnover' || position.status === 'high-turnover') &&
      position.coverageDays !== null &&
      position.avgDailyUnits &&
      position.coverageDays > params.excessCoverageDays
    ) {
      if (position.unitCost === null) {
        uncosted++;
        continue;
      }
      const targetUnits = params.targetCoverageDays * position.avgDailyUnits;
      const excessUnits = position.onHand - targetUnits;
      const excessValue = excessUnits * position.unitCost;
      if (excessValue < MIN_CAPITAL) continue;
      const draft = finish(ctx, {
        ...base,
        type: 'tied_up_capital',
        dedupeKey: `tied_up_capital:product:${position.productId}`,
        title: `Capital em excesso: ${position.name}`,
        summary: `O estoque cobre ${formatDays(position.coverageDays)} de vendas, acima do limite de ${formatDays(params.excessCoverageDays)}. Cerca de ${formatCurrency(excessValue)} além da cobertura-alvo.`,
        confidence: clampConfidence(0.75 * historyFactor(position.windowDays, params.velocityWindowDays) * snapshotFactor(stockAge)),
        impactValue: excessValue,
        impactKind: 'capital',
        impactMethod: `(estoque − cobertura-alvo de ${params.targetCoverageDays} dias × venda média diária) × custo unitário. Capital que pode ser liberado comprando menos; não é lucro.`,
        facts: [
          ...positionFacts(position, source),
          { label: 'Venda média por dia', value: position.avgDailyUnits, format: 'number', source },
          { label: 'Cobertura atual', value: position.coverageDays, format: 'days', source },
          { label: 'Giro anual', value: position.annualTurnover ?? 0, format: 'number', source },
          { label: 'Estoque para a cobertura-alvo', value: targetUnits, format: 'number', source: 'Configurações → Análises' },
        ],
        hypotheses: ['Compra acima da demanda ou lote mínimo do fornecedor.', 'Queda recente nas vendas do item.'],
        recommendations: ['Reduzir ou adiar as próximas compras.', 'Negociar lotes menores com o fornecedor.'],
      });
      if (draft) result.drafts.push(draft);
      else result.discarded++;
      continue;
    }

    if (position.status === 'rupture' || position.status === 'rupture-risk') {
      if (stockAge > MAX_RUPTURE_SNAPSHOT_AGE) {
        staleRuptures++;
        continue;
      }
      const daily = position.avgDailyUnits ?? 0;
      if (daily <= 0) continue;
      const coverage = position.status === 'rupture' ? 0 : (position.coverageDays ?? 0);
      const daysShort = Math.max(position.leadTimeDays - coverage, 0);
      const metrics = ctx.productsById.get(position.productId);
      const unitProfit =
        metrics && metrics.grossMargin !== null && metrics.unitsSold > 0 && (metrics.costCoverage ?? 0) >= 0.9 ? metrics.grossProfit / metrics.unitsSold : null;
      const unitsAtRisk = daily * daysShort;
      if (unitsAtRisk < 1) continue;
      const impact = unitProfit !== null && unitProfit > 0 ? unitsAtRisk * unitProfit : 0;
      const reorder = Math.ceil(daily * (position.leadTimeDays + params.targetCoverageDays) - Math.max(position.onHand, 0));
      const isRupture = position.status === 'rupture';
      const draft = finish(ctx, {
        ...base,
        type: 'rupture_risk',
        dedupeKey: `rupture_risk:product:${position.productId}`,
        title: isRupture ? `Ruptura: ${position.name} sem estoque` : `Risco de ruptura: ${position.name}`,
        summary: isRupture
          ? `Sem estoque na posição de ${formatDate(position.snapshotDate)}, vendendo ${formatNumber(daily)} por dia em média. A reposição leva ${formatDays(position.leadTimeDays)}.`
          : `O estoque cobre ${formatDays(coverage)} de vendas e a reposição leva ${formatDays(position.leadTimeDays)}.`,
        confidence: clampConfidence(
          (isRupture ? 0.8 : 0.7) * historyFactor(position.windowDays, params.velocityWindowDays) * snapshotFactor(stockAge) * (position.unitsWindow >= 5 ? 1 : 0.8),
        ),
        impactValue: impact,
        impactKind: 'one_off_profit',
        impactMethod:
          unitProfit !== null && unitProfit > 0
            ? 'Venda média diária × dias sem produto até a reposição (prazo − cobertura) × lucro bruto médio por unidade. Estimativa: supõe que a demanda continua igual.'
            : 'Sem custo confiável para o produto: o lucro em risco não foi estimado. O risco operacional continua.',
        facts: [
          ...positionFacts(position, source),
          { label: 'Venda média por dia', value: daily, format: 'number', source },
          { label: 'Cobertura', value: coverage, format: 'days', source },
          { label: 'Prazo de reposição considerado', value: position.leadTimeDays, format: 'days', source: 'Cadastro do produto, do fornecedor ou padrão da empresa' },
          ...(unitProfit !== null ? [{ label: 'Lucro bruto médio por unidade', value: unitProfit, format: 'currency' as const, source: 'Métricas de vendas da janela de análise' }] : []),
          ...(stockAge > 0 ? [{ label: 'Dias entre a posição e a última venda importada', value: stockAge, format: 'days' as const, source }] : []),
        ],
        hypotheses: ['Pedido de compra atrasado ou não emitido.', 'Venda acima do normal no período.', 'Prazo real do fornecedor maior que o cadastrado.'],
        recommendations: [
          `Emitir pedido de cerca de ${formatNumber(Math.max(reorder, 1))} unidades (reposição + cobertura-alvo de ${params.targetCoverageDays} dias).`,
          'Confirmar o prazo de entrega com o fornecedor.',
        ],
        floor: ctx.topProducts.has(position.productId) ? 'high' : isRupture ? 'medium' : undefined,
      });
      if (draft) result.drafts.push(draft);
      else result.discarded++;
    }
  }

  if (staleRuptures > 0) {
    result.limitations.push(
      `${staleRuptures} ${staleRuptures === 1 ? 'produto' : 'produtos'} com sinal de ruptura não ${staleRuptures === 1 ? 'foi avaliado' : 'foram avaliados'}: a posição de estoque tem mais de ${MAX_RUPTURE_SNAPSHOT_AGE} dias em relação às vendas.`,
    );
  }
  if (uncosted > 0) {
    result.limitations.push(`${uncosted} ${uncosted === 1 ? 'item' : 'itens'} de estoque sem custo: capital parado ou em excesso não calculado.`);
  }
  return result;
}

import { formatDate, formatPercent } from '@/lib/format';
import type { RuleContext } from './context';
import { inventoryRules } from './rules/inventory';
import { marginRules } from './rules/margin';
import { performanceRules } from './rules/performance';
import { monthly } from './scoring';
import type { EngineInput, EngineResult, OpportunityDraft, Priority } from './types';

/**
 * Intelligence Engine: deterministic rules over the metric layer. Same input,
 * same output, in the same order. No AI and no data is invented: a rule
 * without enough evidence produces nothing, and the reason goes to the
 * limitations list shown to the user.
 */

export const MAX_OPPORTUNITIES = 200;
const MIN_HISTORY_FOR_COMPARISON = 60;

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function topByProfit(input: EngineInput) {
  const profitable = input.products.filter((product) => product.grossProfit > 0).sort((a, b) => b.grossProfit - a.grossProfit || a.productId.localeCompare(b.productId));
  return new Set(profitable.slice(0, Math.max(1, Math.ceil(profitable.length * 0.2))).map((product) => product.productId));
}

function inputLimitations(input: EngineInput): string[] {
  const notes: string[] = [];
  if (!input.window || !input.totals || input.totals.saleLines === 0) {
    notes.push('Sem vendas importadas: margem, descontos, ruptura e queda de vendas não foram avaliados.');
  } else {
    const coverage = input.totals.costCoverage;
    if (coverage !== null && coverage < 0.999) {
      notes.push(`${formatPercent(1 - coverage)} da receita sem custo conhecido: margens calculadas só sobre os itens com custo.`);
    }
    if (input.totals.orders === 0) {
      notes.push('Vendas sem número de pedido ou cupom: número de vendas e ticket médio indisponíveis.');
    }
    if (!input.comparison) {
      notes.push(`Menos de ${MIN_HISTORY_FOR_COMPARISON} dias de vendas: comparação entre períodos (quedas e custos) não avaliada.`);
    }
  }
  if (!input.inventory) {
    notes.push('Sem posição de estoque: itens parados, capital em excesso e ruptura não foram avaliados.');
  } else {
    if (input.inventory.soldWithoutPosition > 0) {
      notes.push(`${input.inventory.soldWithoutPosition} produtos vendidos não aparecem na posição de estoque de ${formatDate(input.inventory.asOf)}.`);
    }
    const history = input.inventory.positions.find((position) => position.historyDays !== null)?.historyDays ?? null;
    if (history !== null && history < input.params.stalledDays) {
      notes.push(`Histórico de vendas de ${history} dias, menor que o limite de item parado (${input.params.stalledDays} dias): itens parados não foram avaliados.`);
    }
  }
  return notes;
}

export function runEngine(input: EngineInput): EngineResult {
  const scaleDays = input.window?.days ?? 0;
  const ctx: RuleContext = {
    input,
    scale: {
      monthlyGrossProfit: input.totals && input.totals.costedNetRevenue > 0 ? monthly(input.totals.grossProfit, scaleDays) : null,
      monthlyNetRevenue: input.totals ? monthly(input.totals.netRevenue, scaleDays) : null,
      stockValue: input.inventory?.totalValue ?? null,
    },
    topProducts: topByProfit(input),
    productsById: new Map(input.products.map((product) => [product.productId, product])),
  };

  const results = [marginRules(ctx), inventoryRules(ctx), performanceRules(ctx)];
  const drafts: OpportunityDraft[] = results.flatMap((result) => result.drafts);
  const limitations = [...inputLimitations(input), ...results.flatMap((result) => result.limitations)];

  const discarded = results.reduce((sum, result) => sum + result.discarded, 0);
  if (discarded > 0) {
    limitations.push(`${discarded} ${discarded === 1 ? 'sinal não virou oportunidade' : 'sinais não viraram oportunidades'} por pouca evidência (confiança baixa ou impacto pequeno).`);
  }

  drafts.sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      b.confidence - a.confidence ||
      b.impactValue - a.impactValue ||
      a.dedupeKey.localeCompare(b.dedupeKey),
  );
  if (drafts.length > MAX_OPPORTUNITIES) {
    limitations.push(`Mostrando as ${MAX_OPPORTUNITIES} oportunidades mais importantes de ${drafts.length} encontradas.`);
  }
  return { opportunities: drafts.slice(0, MAX_OPPORTUNITIES), limitations };
}

export { MIN_HISTORY_FOR_COMPARISON };

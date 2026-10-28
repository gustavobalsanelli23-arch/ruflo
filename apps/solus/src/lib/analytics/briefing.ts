import type { BriefingSegment, PeriodKey } from '@/lib/data/types';
import { formatCurrency, formatPercent, formatSignedPercent, relativeChange } from '@/lib/format';
import type { PeriodTotals } from '@/lib/intelligence/types';

/**
 * The overview's opening sentences for a real organization, assembled from
 * the metric layer. Facts only: each figure is a number the screen also
 * shows, and what cannot be computed is said as such.
 */
const PHRASE: Record<PeriodKey, string> = {
  '7d': ' nos últimos 7 dias',
  '30d': ' nos últimos 30 dias',
  '90d': ' nos últimos 90 dias',
  '12m': ' nos últimos 12 meses',
  ytd: ' no ano até agora',
};

export function buildBriefing(args: {
  period: PeriodKey;
  current: PeriodTotals;
  previous: PeriodTotals;
  openOpportunities: number;
  urgentOpportunities: number;
}): BriefingSegment[] {
  const { current, previous } = args;
  const segments: BriefingSegment[] = [];
  const text = (value: string) => segments.push({ kind: 'text', text: value });
  const figure = (value: string, tone?: 'positive' | 'negative') => segments.push({ kind: 'figure', text: value, tone });

  text('Receita líquida de ');
  figure(formatCurrency(current.netRevenue, { whole: true }));
  text(PHRASE[args.period]);
  const change = relativeChange(current.netRevenue, previous.netRevenue);
  if (change !== null && previous.netRevenue > 0) {
    text(', ');
    figure(formatSignedPercent(change), change >= 0 ? 'positive' : 'negative');
    text(' em relação ao período anterior');
  }
  text('. ');

  if (current.netRevenue > 0) {
    if (current.grossMargin !== null) {
      text('Margem bruta de ');
      figure(formatPercent(current.grossMargin));
      if (current.costCoverage !== null && current.costCoverage < 0.999) {
        text(`, calculada sobre ${formatPercent(current.costCoverage, 0)} da receita (a parte com custo conhecido)`);
      }
      text('. ');
    } else {
      text('Margem bruta indisponível: falta o custo dos produtos vendidos. ');
    }
  }
  if (current.returns > 0) {
    text('Devoluções somam ');
    figure(formatCurrency(current.returns, { whole: true }));
    text('. ');
  }

  if (args.openOpportunities > 0) {
    figure(String(args.openOpportunities));
    text(args.openOpportunities === 1 ? ' oportunidade aberta' : ' oportunidades abertas');
    if (args.urgentOpportunities > 0) {
      text(', ');
      figure(String(args.urgentOpportunities));
      text(' de prioridade alta ou crítica');
    }
    text('.');
  } else {
    text('Nenhuma oportunidade aberta com evidência suficiente.');
  }
  return segments;
}

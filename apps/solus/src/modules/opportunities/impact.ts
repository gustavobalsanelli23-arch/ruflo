import type { Opportunity } from '@/lib/data/types';
import { formatCurrency, formatPercent } from '@/lib/format';

export function impactLabel(op: Pick<Opportunity, 'impact' | 'impactKind'>, compact = false): string {
  const value = formatCurrency(op.impact, { whole: true, compact });
  return op.impactKind === 'monthly' ? `${value} por mês` : `${value} uma vez`;
}

export function impactShort(op: Pick<Opportunity, 'impact' | 'impactKind'>): { value: string; suffix: string } {
  return {
    value: formatCurrency(op.impact, { whole: true }),
    suffix: op.impactKind === 'monthly' ? '/mês' : 'pontual',
  };
}

export function confidenceLabel(confidence: number): string {
  const level = confidence >= 0.8 ? 'alta' : confidence >= 0.6 ? 'moderada' : 'baixa';
  return `Confiança ${level}, ${formatPercent(confidence, 0)}`;
}

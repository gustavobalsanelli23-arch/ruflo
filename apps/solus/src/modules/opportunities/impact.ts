import type { Opportunity } from '@/lib/data/types';
import { formatCurrency } from '@/lib/format';

export function impactShort(op: Pick<Opportunity, 'impact' | 'impactKind'>): { value: string; suffix: string } {
  return {
    value: formatCurrency(op.impact, { whole: true }),
    suffix: op.impactKind === 'monthly' ? '/mês' : 'pontual',
  };
}

/** One-off gains are spread over 12 months so both kinds can be ranked and plotted together. */
export const monthlyEquivalent = (op: Pick<Opportunity, 'impact' | 'impactKind'>) =>
  op.impactKind === 'monthly' ? op.impact : op.impact / 12;

import type { Opportunity } from '@/lib/data/types';
import { formatCurrency } from '@/lib/format';

const SUFFIX: Record<Opportunity['impactKind'], string> = { monthly: '/mês', 'one-off': 'pontual', capital: 'em capital' };

export function impactShort(op: Pick<Opportunity, 'impact' | 'impactKind'>): { value: string; suffix: string } {
  return { value: formatCurrency(op.impact, { whole: true }), suffix: SUFFIX[op.impactKind] };
}

/**
 * One-off gains are spread over 12 months so both kinds can be ranked and
 * plotted together. Capital tied up in stock is not profit: it never enters
 * this sum (it is shown on its own).
 */
export const monthlyEquivalent = (op: Pick<Opportunity, 'impact' | 'impactKind'>) =>
  op.impactKind === 'monthly' ? op.impact : op.impactKind === 'one-off' ? op.impact / 12 : 0;

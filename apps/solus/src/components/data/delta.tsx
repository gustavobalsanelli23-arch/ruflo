import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatPoints, formatSignedPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export type GoodWhen = 'up' | 'down' | 'neutral';

const EPSILON = 0.0005;

export function deltaTone(value: number | null, goodWhen: GoodWhen) {
  if (value === null || Math.abs(value) < EPSILON || goodWhen === 'neutral') return 'neutral' as const;
  const up = value > 0;
  return (goodWhen === 'up') === up ? ('positive' as const) : ('negative' as const);
}

/**
 * Signed change against a named period. Direction is carried by the arrow and
 * the sign, colour only reinforces it (never colour alone).
 */
export function Delta({
  value,
  kind = 'percent',
  goodWhen = 'up',
  comparedTo = 'período anterior',
  size = 'sm',
  className,
}: {
  value: number | null;
  kind?: 'percent' | 'points';
  goodWhen?: GoodWhen;
  comparedTo?: string;
  size?: 'xs' | 'sm';
  className?: string;
}) {
  if (value === null) {
    return <span className={cn('text-xs text-subtle-foreground', className)}>Sem base de comparação</span>;
  }
  const tone = deltaTone(value, goodWhen);
  const flat = Math.abs(value) < EPSILON;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const text = kind === 'points' ? formatPoints(value) : formatSignedPercent(value);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-medium tabular whitespace-nowrap',
        size === 'xs' ? 'text-xs' : 'text-sm',
        tone === 'positive' && 'text-positive-text',
        tone === 'negative' && 'text-critical-text',
        tone === 'neutral' && 'text-muted-foreground',
        className,
      )}
    >
      <Icon aria-hidden="true" className={size === 'xs' ? 'size-3.5' : 'size-4'} />
      {text}
      <span className="sr-only"> em relação ao {comparedTo}</span>
    </span>
  );
}

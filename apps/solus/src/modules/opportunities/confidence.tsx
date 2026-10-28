import { Meter } from '@/components/data/meter';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

export type ConfidenceLevel = 'alta' | 'moderada' | 'baixa';

export function confidenceLevel(value: number): ConfidenceLevel {
  return value >= 0.8 ? 'alta' : value >= 0.6 ? 'moderada' : 'baixa';
}

/** How sure the analysis is: the meter and the percentage always travel together. */
export function ConfidenceMeter({ value, withWord = false, className }: { value: number; withWord?: boolean; className?: string }) {
  const level = confidenceLevel(value);
  const tone = level === 'alta' ? 'positive' : level === 'moderada' ? 'brand' : 'warning';
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Meter value={value} tone={tone} label={`Confiança ${level}, ${formatPercent(value, 0)}`} className="w-12 shrink-0" />
      <span className="text-xs whitespace-nowrap text-muted-foreground tabular">
        {formatPercent(value, 0)}
        {withWord && <span> ({level})</span>}
      </span>
    </span>
  );
}

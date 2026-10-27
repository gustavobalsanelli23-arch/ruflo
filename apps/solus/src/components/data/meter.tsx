import { cn } from '@/lib/utils';

export type MeterTone = 'brand' | 'positive' | 'warning' | 'critical' | 'neutral';

const FILL: Record<MeterTone, string> = {
  brand: 'bg-series-1',
  positive: 'bg-positive',
  warning: 'bg-warning',
  critical: 'bg-critical',
  neutral: 'bg-subtle-foreground',
};

const TRACK: Record<MeterTone, string> = {
  brand: 'bg-brand-soft',
  positive: 'bg-positive-soft',
  warning: 'bg-warning-soft',
  critical: 'bg-critical-soft',
  neutral: 'bg-neutral-soft',
};

/** A ratio against a limit. The track is a lighter step of the fill's own hue. */
export function Meter({
  value,
  max = 1,
  tone = 'brand',
  label,
  className,
}: {
  value: number;
  max?: number;
  tone?: MeterTone;
  label: string;
  className?: string;
}) {
  const ratio = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(2))}
      className={cn('h-1.5 w-full overflow-hidden rounded-full', TRACK[tone], className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-(--ease-out-quint)', FILL[tone])}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

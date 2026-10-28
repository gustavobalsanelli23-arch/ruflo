import { cn } from '@/lib/utils';

const VALUE_SIZE = {
  sm: 'text-xl leading-7',
  md: 'text-2xl leading-8',
  lg: 'text-[1.75rem] leading-9',
  xl: 'text-[2.125rem] leading-10 tracking-[-0.03em]',
} as const;

/**
 * Stat tile contract (dataviz): label in sentence case, value in proportional
 * figures, then the signed change and what it is compared against on one
 * line, with an optional sparkline beside the label.
 */
export function Stat({
  label,
  value,
  delta,
  hint,
  trend,
  size = 'md',
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  hint?: React.ReactNode;
  trend?: React.ReactNode;
  size?: keyof typeof VALUE_SIZE;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <dt className="flex min-h-5 items-start justify-between gap-3 text-sm text-pretty text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2">{label}</span>
        {trend && <span className="-mt-0.5 hidden shrink-0 sm:block">{trend}</span>}
      </dt>
      <dd className={cn('mt-1.5 font-semibold tracking-[-0.02em] text-foreground', VALUE_SIZE[size])}>{value}</dd>
      {(delta || hint) && (
        <dd className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {delta}
          {hint && <span className="min-w-0 text-xs text-subtle-foreground">{hint}</span>}
        </dd>
      )}
    </div>
  );
}

/** A strip of related figures divided by hairlines, not a row of identical cards. */
export function StatStrip({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <dl
      aria-label={label}
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-card md:grid-cols-4',
        '*:bg-card *:bg-(image:--card-sheen) *:px-5 *:py-4',
        className,
      )}
    >
      {children}
    </dl>
  );
}

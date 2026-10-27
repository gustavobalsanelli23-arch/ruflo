import { cn } from '@/lib/utils';

/**
 * Stat tile contract (dataviz): label in sentence case, value in proportional
 * figures, an optional signed delta against a named period, optional trend.
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
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  hint?: React.ReactNode;
  trend?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <dt className="text-sm text-pretty text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          className={cn(
            'font-semibold tracking-[-0.02em] text-foreground',
            size === 'sm' && 'text-xl',
            size === 'md' && 'text-2xl',
            size === 'lg' && 'text-3xl',
          )}
        >
          {value}
        </span>
        {delta}
      </dd>
      {(hint || trend) && (
        <dd className="mt-2 flex items-end justify-between gap-3">
          {hint ? <span className="text-xs text-subtle-foreground">{hint}</span> : <span />}
          {trend}
        </dd>
      )}
    </div>
  );
}

/** A strip of related figures divided by hairlines, not a row of identical cards. */
export function StatStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <dl
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

/** The single number a view leads with. Exactly one per screen. */
export function HeroFigure({
  label,
  value,
  delta,
  footnote,
}: {
  label: string;
  value: string;
  delta?: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[2.5rem] leading-none font-semibold tracking-[-0.035em] text-foreground sm:text-[3.25rem]">
          {value}
        </span>
        {delta}
      </p>
      {footnote && <p className="mt-2 text-xs text-subtle-foreground">{footnote}</p>}
    </div>
  );
}

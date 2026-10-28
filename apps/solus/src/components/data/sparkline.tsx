import { cn } from '@/lib/utils';

/**
 * 12-point trend in the de-emphasis hue, with the current value in the accent
 * (dataviz stat-tile contract). Decorative next to its number, so hidden from
 * assistive tech; the value and delta carry the information.
 */
export function Sparkline({
  values,
  className,
  width = 72,
  height = 22,
}: {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const last = values.at(-1) ?? 0;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke="var(--series-muted)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="3" fill="var(--series-1)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  );
}

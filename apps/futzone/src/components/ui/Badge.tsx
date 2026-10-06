import { cn } from '@/lib/format';

export type BadgeTone = 'brand' | 'solid' | 'neutral' | 'success' | 'warn' | 'danger' | 'violet' | 'info';

const TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-500/15 text-brand-300 ring-brand-500/30',
  solid: 'bg-brand-500 text-white ring-brand-400/40',
  neutral: 'bg-surface-3 text-fg-2 ring-line-strong',
  success: 'bg-success/12 text-success ring-success/30',
  warn: 'bg-warn/12 text-warn ring-warn/30',
  danger: 'bg-danger/12 text-danger ring-danger/30',
  violet: 'bg-violet/12 text-violet ring-violet/30',
  info: 'bg-info/12 text-info ring-info/30',
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = 'neutral', dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

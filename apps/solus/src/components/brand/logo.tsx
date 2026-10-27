import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * SOLUS mark: an eclipse. A dark disc, a crescent of light and a faint
 * corona ring — what you see past the obvious ("See beyond the numbers").
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const id = useId();
  const mask = `${id}-crescent`;
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-7 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <mask id={mask}>
          <rect width="32" height="32" fill="white" />
          <circle cx="14.1" cy="17.9" r="10.6" fill="black" />
        </mask>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeOpacity="0.26" strokeWidth="1" />
      <circle cx="16" cy="16" r="11.5" fill="currentColor" fillOpacity="0.1" />
      <circle cx="16" cy="16" r="11.5" fill="currentColor" mask={`url(#${mask})`} />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} translate="no">
      <LogoMark className="text-sidebar-primary" />
      {!compact && <span className="text-[13px] font-semibold tracking-[0.22em] text-sidebar-accent-foreground">SOLUS</span>}
    </span>
  );
}

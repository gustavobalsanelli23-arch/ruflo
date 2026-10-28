import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * The SOLUS eclipse at display scale: the logo's disc, crescent and corona,
 * with two extra hairline rings. Decorative only. The crescent is revealed
 * once on load (skipped when the person prefers reduced motion).
 */
export function EclipseArt({ className }: { className?: string }) {
  const id = useId();
  const mask = `${id}-crescent`;
  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" className={cn('pointer-events-none select-none', className)}>
      <defs>
        <mask id={mask}>
          <rect width="400" height="400" fill="white" />
          <circle cx="180.2" cy="219.8" r="110.6" fill="black" className="eclipse-occluder" />
        </mask>
      </defs>
      <circle cx="200" cy="200" r="196" fill="none" stroke="currentColor" strokeOpacity="0.07" />
      <circle cx="200" cy="200" r="172" fill="none" stroke="currentColor" strokeOpacity="0.1" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeOpacity="0.22" />
      <circle cx="200" cy="200" r="120" fill="currentColor" fillOpacity="0.07" />
      <circle cx="200" cy="200" r="120" fill="currentColor" mask={`url(#${mask})`} />
    </svg>
  );
}

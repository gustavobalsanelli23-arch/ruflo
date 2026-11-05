import { AppLink as Link } from '@/components/shell/base-path';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline link to a deeper view. The arrow is the only decoration. The padding,
 * cancelled by an equal negative margin, makes the touch target 32px tall
 * without moving anything around it; `relative` keeps that extra area on top
 * of the content that follows (a panel body), so taps there reach the link.
 */
export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'group/link relative -my-1.5 inline-flex items-center gap-1 rounded py-1.5 text-sm font-medium text-brand outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/60',
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-3.5 transition-transform duration-150 group-hover/link:translate-x-0.5" />
    </Link>
  );
}

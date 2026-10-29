import { AppLink as Link } from '@/components/shell/base-path';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Inline link to a deeper view. The arrow is the only decoration. */
export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'group/link inline-flex items-center gap-1 rounded text-sm font-medium text-brand outline-none underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/60',
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-3.5 transition-transform duration-150 group-hover/link:translate-x-0.5" />
    </Link>
  );
}

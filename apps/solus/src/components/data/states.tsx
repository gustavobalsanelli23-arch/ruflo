import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** An empty view is an invitation to act: say what is missing and how to fill it. */
export function EmptyState({
  icon: Icon = Info,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <Icon aria-hidden="true" className="size-6 text-subtle-foreground" strokeWidth={1.5} />
      <p className="mt-3 text-base font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const NOTICE = {
  info: { icon: Info, box: 'border-brand/25 bg-brand-soft', icn: 'text-brand' },
  success: { icon: CircleCheck, box: 'border-positive/25 bg-positive-soft', icn: 'text-positive-text' },
  warning: { icon: TriangleAlert, box: 'border-warning/30 bg-warning-soft', icn: 'text-warning-text' },
  error: { icon: CircleAlert, box: 'border-critical/30 bg-critical-soft', icn: 'text-critical-text' },
} as const;

/** Inline status message. Errors say what happened and what to do next. */
export function Notice({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof NOTICE;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const style = NOTICE[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border px-4 py-3', style.box, className)}
    >
      <style.icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', style.icn)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {children && <div className="mt-0.5 text-sm text-muted-foreground">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

import { cn } from '@/lib/utils';

/**
 * The module surface. One component for every analytic block so spacing,
 * heading size and actions placement never drift between screens.
 */
export function Panel({
  title,
  description,
  action,
  footer,
  children,
  className,
  bodyClassName,
  as: Tag = 'section',
  id,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: 'section' | 'div' | 'article';
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <Tag
      id={id}
      aria-labelledby={title && headingId ? headingId : undefined}
      aria-label={!headingId && typeof title === 'string' ? title : undefined}
      className={cn('surface flex min-w-0 flex-col rounded-xl', className)}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="text-base font-semibold tracking-[-0.01em] text-foreground">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn('min-w-0 flex-1 px-5 pt-4 pb-5', bodyClassName)}>{children}</div>
      {footer && <footer className="mt-auto flex items-center border-t px-5 py-3">{footer}</footer>}
    </Tag>
  );
}

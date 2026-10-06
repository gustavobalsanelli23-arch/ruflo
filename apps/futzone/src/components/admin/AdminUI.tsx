import { cn } from '@/lib/format';

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div>
        <h1 className="heading-display text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, className, children }: { title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-line bg-surface', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'brand' | 'success' | 'warn' | 'danger';
  /** Valor longo (ex.: moeda): usa fonte menor. */
  compact?: boolean;
}

const TONE = {
  brand: 'bg-brand-500/12 text-brand-400',
  success: 'bg-success/12 text-success',
  warn: 'bg-warn/12 text-warn',
  danger: 'bg-danger/12 text-danger',
};

/** Card de indicador do dashboard. */
export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', compact }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE[tone])}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className={cn('heading-display mt-3 truncate tabular-nums', compact ? 'text-3xl sm:text-4xl xl:text-[1.9rem] xl:leading-[3rem]' : 'text-4xl sm:text-5xl')} title={value}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Tabela administrativa: rola na horizontal em telas pequenas, sem quebrar. */
export function AdminTable({ head, children, minWidth = 720 }: { head: React.ReactNode[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line text-left text-[0.68rem] uppercase tracking-wider text-muted">
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&_td]:px-4 [&_td]:py-3 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5">{children}</tbody>
      </table>
    </div>
  );
}

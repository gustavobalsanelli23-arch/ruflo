'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { LoaderCircle, Search } from 'lucide-react';
import { cn } from '@/lib/format';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';

/*
 * Biblioteca visual do painel. Estilo próprio (mais sóbrio e denso que a loja),
 * mantendo as cores da FutZone. Tudo do admin deve usar estes componentes.
 */

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-fg sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminCard({ title, description, action, className, children }: { title?: string; description?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-white/[0.06] bg-surface', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type Tone = 'brand' | 'success' | 'warn' | 'danger' | 'neutral';

const STAT_TONE: Record<Tone, string> = {
  brand: 'bg-brand-500/12 text-brand-400',
  success: 'bg-success/12 text-success',
  warn: 'bg-warn/12 text-warn',
  danger: 'bg-danger/12 text-danger',
  neutral: 'bg-white/[0.06] text-fg-2',
};

interface AdminStatsProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  href?: string;
}

/** Indicador do dashboard. */
export function AdminStats({ label, value, hint, icon: Icon, tone = 'brand', href }: AdminStatsProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', STAT_TONE[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 truncate text-[1.7rem] font-extrabold leading-none tracking-tight text-fg tabular-nums" title={value}>
        {value}
      </p>
      {hint && <p className="mt-2 truncate text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = 'block min-w-0 rounded-2xl border border-white/[0.06] bg-surface p-4 sm:p-5';
  return href ? (
    <Link href={href} className={cn(cls, 'transition-colors hover:border-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Tabela administrativa: rola na horizontal em telas pequenas, sem quebrar o layout. */
export function AdminTable({ head, children, minWidth = 720, caption }: { head: React.ReactNode[]; children: React.ReactNode; minWidth?: number; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-[0.7rem] font-semibold text-muted">
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold first:pl-5 last:pr-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05] [&_td]:px-4 [&_td]:py-3 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_tr]:transition-colors [&_tr:hover]:bg-white/[0.02]">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function AdminBadge({ tone = 'neutral', dot = true, children, className }: { tone?: BadgeTone; dot?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Badge tone={tone} dot={dot} className={cn('normal-case tracking-normal', className)}>
      {children}
    </Badge>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'icon';

const BTN_BASE =
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50';
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-400',
  secondary: 'bg-white/[0.07] text-fg hover:bg-white/[0.12]',
  outline: 'border border-line-strong text-fg-2 hover:border-fg-2 hover:text-fg',
  ghost: 'text-fg-2 hover:bg-white/[0.06] hover:text-fg',
  danger: 'bg-danger/90 text-white hover:bg-danger',
};
const BTN_SIZE: Record<ButtonSize, string> = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', icon: 'size-9' };

export const adminButtonClass = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) =>
  cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className);

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(function AdminButton(
  { variant, size, loading, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={adminButtonClass(variant, size, className)} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function AdminLinkButton({ href, variant, size, className, children, ...rest }: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode; target?: string; rel?: string }) {
  return (
    <Link href={href} className={adminButtonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export const AdminInput = Input;
export const AdminSelect = Select;
export const AdminModal = Modal;
export const AdminConfirm = ConfirmDialog;

/** Campo de busca padrão das listas do painel. */
export function AdminSearch({ value, onChange, placeholder, label, className }: { value: string; onChange(v: string): void; placeholder: string; label: string; className?: string }) {
  return (
    <div className={cn('relative w-full sm:max-w-sm', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-lg border border-line bg-surface-2 pl-10 pr-3 text-sm placeholder:text-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}

/** Abas de filtro com contador. */
export function AdminTabs<T extends string>({ tabs, value, onChange, label }: { tabs: Array<{ id: T; label: string; count?: number; color?: string }>; value: T; onChange(v: T): void; label: string }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label={label}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
              active ? 'bg-brand-500 text-white' : 'bg-white/[0.04] text-fg-2 hover:bg-white/[0.08] hover:text-fg',
            )}
          >
            {t.color && <span className="size-2 rounded-full" style={{ background: t.color }} aria-hidden />}
            {t.label}
            {t.count !== undefined && <span className={cn('rounded-md px-1.5 text-[0.65rem] tabular-nums', active ? 'bg-white/20' : 'bg-white/[0.06] text-muted')}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).slice(0, 2).join('');
}

export function AdminAvatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white ring-2 ring-brand-500/25', className)} aria-hidden>
      {initials}
    </span>
  );
}

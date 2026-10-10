import Link from 'next/link';
import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-brand-500 active:bg-brand-700 disabled:bg-surface-3 disabled:text-subtle disabled:shadow-none',
  secondary: 'bg-steel-3 text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] hover:bg-surface-3 disabled:text-subtle',
  outline: 'border border-line-strong text-fg hover:border-fg-2 hover:bg-white/[0.03] disabled:text-subtle',
  ghost: 'text-fg-2 hover:bg-white/[0.05] hover:text-fg',
  danger: 'bg-danger/12 text-danger hover:bg-danger hover:text-white',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.7rem] gap-1.5',
  md: 'h-11 px-5 text-[0.78rem] gap-2',
  lg: 'h-13 px-7 text-[0.82rem] gap-2.5',
  icon: 'size-10 justify-center',
};

const BASE =
  'relative inline-flex items-center justify-center rounded-[var(--radius-button,9999px)] font-bold uppercase tracking-[0.12em] select-none whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out-fz)] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
}

export const buttonClass = ({ variant = 'primary', size = 'md', block, className }: ButtonStyleProps = {}) =>
  cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className);

type ButtonProps = ButtonStyleProps & React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Mostra um indicador de carregamento e desabilita o botão. */
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, className, type = 'button', loading, disabled, children, ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass({ variant, size, block, className })} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

type LinkButtonProps = ButtonStyleProps & React.ComponentProps<typeof Link>;

export function LinkButton({ variant, size, block, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass({ variant, size, block, className })} {...props} />;
}

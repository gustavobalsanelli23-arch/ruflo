import Link from 'next/link';
import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-400 hover:shadow-[0_10px_28px_-12px_var(--color-brand-400)] active:bg-brand-600 disabled:bg-surface-3 disabled:text-subtle disabled:shadow-none',
  secondary: 'bg-white/[0.08] text-fg hover:bg-white/[0.14] disabled:text-subtle',
  outline: 'border border-line-strong text-fg hover:border-fg-2 hover:bg-white/[0.04] disabled:text-subtle',
  ghost: 'text-fg-2 hover:bg-white/[0.06] hover:text-fg',
  danger: 'bg-danger/12 text-danger hover:bg-danger hover:text-white',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-[0.8rem] gap-2.5',
  icon: 'size-10 justify-center',
};

const BASE =
  'relative inline-flex items-center justify-center rounded-full font-bold uppercase tracking-[0.1em] select-none whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-fz)] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

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

import Link from 'next/link';
import { forwardRef } from 'react';
import { cn } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white shadow-[0_8px_24px_-10px_var(--color-brand-500)] hover:bg-brand-400 active:bg-brand-600 disabled:bg-surface-3 disabled:text-subtle disabled:shadow-none',
  secondary: 'bg-surface-3 text-fg hover:bg-line-strong disabled:text-subtle',
  outline: 'border border-line-strong text-fg hover:border-brand-500 hover:text-brand-300 disabled:text-subtle',
  ghost: 'text-fg-2 hover:bg-surface-3 hover:text-fg',
  danger: 'bg-danger/15 text-danger hover:bg-danger hover:text-white',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-sm gap-2.5',
  icon: 'size-10 justify-center',
};

const BASE =
  'inline-flex items-center justify-center rounded-xl font-bold uppercase tracking-[0.08em] transition-all duration-200 disabled:cursor-not-allowed select-none whitespace-nowrap';

export interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
}

export const buttonClass = ({ variant = 'primary', size = 'md', block, className }: ButtonStyleProps = {}) =>
  cn(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className);

type ButtonProps = ButtonStyleProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, className, type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass({ variant, size, block, className })} {...props} />;
});

type LinkButtonProps = ButtonStyleProps & React.ComponentProps<typeof Link>;

export function LinkButton({ variant, size, block, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass({ variant, size, block, className })} {...props} />;
}

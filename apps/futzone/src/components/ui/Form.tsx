import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/format';

const CONTROL =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-fg placeholder:text-subtle transition-colors hover:border-line-strong focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:opacity-60 aria-[invalid=true]:border-danger';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** Mostra o asterisco de campo obrigatório. */
  required?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => React.ReactNode;
}

/** Envolve qualquer controle com rótulo, dica e mensagem de erro acessíveis. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-fg-2">
        {label}
        {required && (
          <span className="ml-0.5 text-brand-400" aria-hidden>
            *
          </span>
        )}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} role="alert" className="animate-fade text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(CONTROL, 'h-11', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(CONTROL, 'min-h-28 py-3 leading-relaxed', className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(CONTROL, 'h-11 appearance-none pr-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
});

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Botão de seleção (filtros, tamanhos, abas). Selecionado = azul da marca. */
export function Chip({ selected, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        selected
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-line bg-white/[0.02] text-fg-2 hover:border-line-strong hover:text-fg',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}

interface SwitchProps {
  checked: boolean;
  onChange(checked: boolean): void;
  label: React.ReactNode;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-3 text-sm text-fg-2"
    >
      <span className={cn('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-brand-500' : 'bg-surface-3 ring-1 ring-line-strong')}>
        <span className={cn('absolute top-1 size-4 rounded-full bg-white transition-all', checked ? 'left-6' : 'left-1')} />
      </span>
      {label}
    </button>
  );
}

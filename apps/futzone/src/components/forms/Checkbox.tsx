import { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/format';

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Caixa de seleção quadrada, placa de aço que acende no azul quando marcada.
 * O input nativo continua no lugar (só sem a aparência padrão): teclado,
 * formulários, `name` e testes funcionam como em qualquer checkbox.
 * Use dentro de um <label> com o texto.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, ...props }, ref) {
  return (
    <span className={cn('relative grid size-5 shrink-0 place-items-center', className)}>
      <input
        ref={ref}
        type="checkbox"
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-sm border border-line-strong bg-surface-2 transition-[background-color,border-color] duration-150 ease-[var(--ease-out-fz)] hover:border-fg-2/60 checked:border-brand-600 checked:bg-brand-600 checked:hover:border-brand-500 checked:hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger"
        {...props}
      />
      <Check aria-hidden strokeWidth={1.75} className="pointer-events-none relative size-4 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
    </span>
  );
});

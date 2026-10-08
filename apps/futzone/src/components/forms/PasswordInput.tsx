'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/format';
import { Input } from '@/components/ui/Form';

/** Campo de senha com botão mostrar/ocultar (acessível). */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>>(function PasswordInput(
  { className, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? 'text' : 'password'} className={cn('pr-12', className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

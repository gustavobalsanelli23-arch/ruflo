'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/format';
import { passwordStrength } from '@/lib/validation';

const BAR = ['bg-danger', 'bg-danger', 'bg-warn', 'bg-success', 'bg-success'];
const TEXT = ['text-danger', 'text-danger', 'text-warn', 'text-success', 'text-success'];

/** Medidor de força da senha + requisitos atendidos. */
export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const { score, label, checks } = passwordStrength(password);
  const items = [
    { ok: checks.length, text: '8+ caracteres' },
    { ok: checks.mixedCase, text: 'Maiúscula e minúscula' },
    { ok: checks.number, text: 'Número' },
    { ok: checks.symbol || checks.long, text: 'Símbolo ou 12+ caracteres' },
  ];
  return (
    <div id={id} className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-colors duration-300', password && i < Math.max(1, score) ? BAR[score] : 'bg-white/[0.08]')} />
          ))}
        </div>
        <span className={cn('w-20 text-right text-xs font-semibold', password ? TEXT[score] : 'text-subtle')}>{password ? label : 'Força'}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.72rem]">
        {items.map((it) => (
          <li key={it.text} className={cn('flex items-center gap-1.5 transition-colors', it.ok ? 'text-success' : 'text-muted')}>
            {it.ok ? <Check className="size-3" aria-hidden /> : <X className="size-3" aria-hidden />}
            {it.text}
            <span className="sr-only">{it.ok ? '(atendido)' : '(pendente)'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

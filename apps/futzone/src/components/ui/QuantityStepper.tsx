'use client';

import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/format';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange(value: number): void;
  size?: 'sm' | 'md';
  label?: string;
}

export function QuantityStepper({ value, min = 1, max, onChange, size = 'md', label = 'Quantidade' }: QuantityStepperProps) {
  const btn = cn(
    'grid place-items-center text-fg-2 transition-[color,transform] duration-150 hover:text-fg active:scale-90 disabled:cursor-not-allowed disabled:text-subtle disabled:active:scale-100',
    size === 'sm' ? 'size-8' : 'size-11',
  );
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-xl border border-line-strong bg-surface-2">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Diminuir quantidade">
        <Minus className="size-4" />
      </button>
      <output aria-live="polite" className={cn('text-center font-bold tabular-nums', size === 'sm' ? 'w-7 text-sm' : 'w-9')}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Aumentar quantidade">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

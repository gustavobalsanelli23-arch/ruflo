'use client';

import { Check, MapPin } from 'lucide-react';
import type { Address } from '@/types/commerce';
import { cn } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

interface AddressCardProps {
  address: Address;
  /** Modo seleção (checkout): o card vira um rádio. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?(): void;
  actions?: React.ReactNode;
  name?: string;
}

export function AddressCard({ address: a, selectable, selected, onSelect, actions, name = 'endereco' }: AddressCardProps) {
  const body = (
    <>
      <div className="mb-2 flex items-center gap-2">
        <MapPin className="size-4 text-brand-400" aria-hidden />
        <p className="font-bold text-fg">{a.label}</p>
        {a.isDefault && <Badge tone="brand">Principal</Badge>}
        {selectable && (
          <span className={cn('ml-auto grid size-5 place-items-center rounded-full ring-2 transition-colors', selected ? 'bg-brand-500 ring-brand-500' : 'ring-white/20')} aria-hidden>
            {selected && <Check className="animate-pop size-3 text-white" />}
          </span>
        )}
      </div>
      <p className="text-sm text-fg-2">{a.recipient}</p>
      <p className="text-sm text-muted">
        {a.street}, {a.number}
        {a.complement && ` — ${a.complement}`}
        <br />
        {a.district} · {a.city}/{a.state} · CEP {a.zip}
      </p>
      {a.reference && <p className="mt-1 text-xs text-subtle">Ref.: {a.reference}</p>}
    </>
  );

  if (selectable) {
    return (
      <label
        className={cn(
          'block cursor-pointer rounded-2xl bg-surface p-4 ring-1 transition-[box-shadow,transform,background-color] duration-200 active:scale-[0.99] sm:p-5',
          selected ? 'bg-brand-500/[0.06] ring-2 ring-brand-500' : 'ring-white/[0.08] hover:ring-white/20',
        )}
      >
        <input type="radio" name={name} className="sr-only" checked={!!selected} onChange={onSelect} />
        {body}
      </label>
    );
  }

  return (
    <article className={cn('flex flex-col rounded-2xl bg-surface p-5 ring-1', a.isDefault ? 'ring-brand-500/50' : 'ring-white/[0.06]')}>
      {body}
      {actions && <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">{actions}</div>}
    </article>
  );
}

'use client';

import type { Address } from '@/types/commerce';
import { cn } from '@/lib/format';
import { AddressLines } from './AccountUI';

interface AddressCardProps {
  address: Address;
  /** Modo seleção (checkout): o card vira um rádio. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?(): void;
  actions?: React.ReactNode;
  name?: string;
}

/**
 * Endereço como armário: a plaquinha com o nome (Casa, Trabalho…) e
 * "Principal", o destinatário e o endereço em três linhas. No checkout vira
 * um rádio: o escolhido fica no aço mais claro com o contorno azul, igual às
 * opções de frete.
 */
export function AddressCard({ address: a, selectable, selected, onSelect, actions, name = 'endereco' }: AddressCardProps) {
  const plate = (
    <div className="flex h-10 items-center gap-3 border-b border-line px-4">
      {selectable && (
        <span
          aria-hidden
          className={cn(
            'grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors duration-150',
            selected ? 'border-brand-500' : 'border-line-strong group-hover:border-fg-2/60',
          )}
        >
          <span className={cn('size-2 rounded-full bg-brand-500 transition-opacity duration-150', selected ? 'opacity-100' : 'opacity-0')} />
        </span>
      )}
      <p className="plate min-w-0 truncate text-[0.82rem] text-fg">{a.label}</p>
      {a.isDefault && <span className="plate ml-auto shrink-0 text-[0.74rem] text-muted">Principal</span>}
    </div>
  );

  const body = (
    <div className="px-4 py-3.5 text-sm">
      <p className="font-semibold text-fg">{a.recipient}</p>
      <AddressLines address={a} className="mt-0.5 text-fg-2" />
      {a.reference && <p className="mt-1.5 text-xs text-muted">Ref.: {a.reference}</p>}
    </div>
  );

  if (selectable) {
    return (
      <label
        className={cn(
          'motion-lift group block cursor-pointer overflow-hidden rounded-[var(--radius-card)] border transition-[background-color,border-color,box-shadow,scale] duration-150 ease-[var(--ease-out-fz)] active:scale-[0.985]',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-brand-400',
          selected ? 'border-line-strong bg-steel-3 ring-1 ring-inset ring-brand-500' : 'border-line bg-steel hover:bg-steel-2',
        )}
      >
        <input type="radio" name={name} className="sr-only" checked={!!selected} onChange={onSelect} />
        {plate}
        {body}
      </label>
    );
  }

  return (
    <article className="locker relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]">
      {/* A luz do armário fica acesa no endereço principal */}
      {a.isDefault && <span aria-hidden className="pointer-events-none absolute inset-x-[14%] top-0 h-[2px] bg-light" />}
      {plate}
      {body}
      {actions && <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">{actions}</div>}
    </article>
  );
}

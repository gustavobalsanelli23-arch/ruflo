'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Address, Customer } from '@/types/commerce';
import { Button } from '@/components/ui/Button';
import { AddressCard } from '@/components/account/AddressCard';
import { AddressForm } from '@/components/account/AddressForm';

interface Props {
  customer: Customer | null;
  /** Nome sugerido para destinatário (cliente ou visitante). */
  recipientName: string;
  selectedId: string | null;
  oneOff: Address | null;
  onSelect(id: string): void;
  /** Novo endereço: `save` = guardar na conta. */
  onNewAddress(address: Address, save: boolean): void;
  onContinue(): void;
}

/** "Para onde vamos enviar?" — endereços salvos, outro endereço ou novo endereço. */
export function AddressStep({ customer, recipientName, selectedId, oneOff, onSelect, onNewAddress, onContinue }: Props) {
  const saved = customer ? [...customer.addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)) : [];
  const [adding, setAdding] = useState(saved.length === 0 && !oneOff);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const hasSelection = (selectedId === 'avulso' && !!oneOff) || saved.some((a) => a.id === selectedId);

  return (
    <div className="space-y-5">
      <p className="text-sm text-fg-2">Para onde vamos enviar?</p>

      {(saved.length > 0 || oneOff) && (
        <div role="radiogroup" aria-label="Endereço de entrega" className="grid gap-3 md:grid-cols-2">
          {saved.map((a) => (
            <AddressCard key={a.id} address={a} selectable selected={selectedId === a.id} onSelect={() => onSelect(a.id)} />
          ))}
          {oneOff && <AddressCard address={{ ...oneOff, label: oneOff.label || 'Outro endereço' }} selectable selected={selectedId === 'avulso'} onSelect={() => onSelect('avulso')} />}
        </div>
      )}

      {adding ? (
        <div className="animate-fade-up rounded-xl bg-white/[0.03] p-4 sm:p-5">
          <p className="mb-4 text-sm font-semibold text-fg">Novo endereço</p>
          <AddressForm
            defaultRecipient={recipientName}
            showDefaultToggle={false}
            submitLabel="Usar este endereço"
            onCancel={saved.length || oneOff ? () => setAdding(false) : undefined}
            onSubmit={(address) => {
              onNewAddress({ ...address, isDefault: !customer?.addresses.length }, !!customer && saveToAccount);
              setAdding(false);
            }}
          />
          {customer && (
            <label className="mt-4 flex items-center gap-2 text-sm text-fg-2">
              <input type="checkbox" className="size-4 accent-[var(--color-brand-500)]" checked={saveToAccount} onChange={(e) => setSaveToAccount(e.target.checked)} />
              Salvar este endereço na minha conta
            </label>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-3.5 text-sm font-semibold text-fg-2 transition-colors hover:border-fg-2 hover:text-fg">
          <Plus className="size-4" /> Adicionar novo endereço
        </button>
      )}

      {!adding && (
        <Button size="lg" block className="sm:w-auto" disabled={!hasSelection} onClick={onContinue}>
          Continuar
        </Button>
      )}
    </div>
  );
}

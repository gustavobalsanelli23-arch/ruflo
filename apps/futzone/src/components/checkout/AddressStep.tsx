'use client';

import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Address, Customer } from '@/types/commerce';
import { cn } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { AddressCard } from '@/components/account/AddressCard';
import { AddressForm } from '@/components/account/AddressForm';
import { STEEL_ROW } from './styles';

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

/** "Para onde vamos enviar?": endereços salvos, outro endereço ou um novo. */
export function AddressStep({ customer, recipientName, selectedId, oneOff, onSelect, onNewAddress, onContinue }: Props) {
  const saved = customer ? [...customer.addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)) : [];
  const [adding, setAdding] = useState(saved.length === 0 && !oneOff);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const hasSelection = (selectedId === 'avulso' && !!oneOff) || saved.some((a) => a.id === selectedId);
  const hasOptions = saved.length > 0 || !!oneOff;
  const formId = useId();

  return (
    <div className="space-y-5">
      <p className="text-sm text-fg-2">Para onde vamos enviar?</p>

      {hasOptions && (
        <div role="radiogroup" aria-label="Endereço de entrega" className="grid gap-3 md:grid-cols-2">
          {saved.map((a) => (
            <AddressCard key={a.id} address={a} selectable selected={selectedId === a.id} onSelect={() => onSelect(a.id)} />
          ))}
          {oneOff && <AddressCard address={{ ...oneOff, label: oneOff.label || 'Outro endereço' }} selectable selected={selectedId === 'avulso'} onSelect={() => onSelect('avulso')} />}
        </div>
      )}

      {adding ? (
        <div className={cn('animate-fade', hasOptions && 'border-t border-line pt-5')}>
          <h3 className="mb-4 text-sm font-semibold text-fg">Novo endereço</h3>
          {/* Os botões ficam fora do formulário (form=…): a opção de salvar vem antes de confirmar */}
          <AddressForm
            formId={formId}
            hideActions
            defaultRecipient={recipientName}
            showDefaultToggle={false}
            onSubmit={(address) => {
              onNewAddress({ ...address, isDefault: !customer?.addresses.length }, !!customer && saveToAccount);
              setAdding(false);
            }}
          />
          {customer && (
            <label className="mt-4 flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-fg-2">
              <input type="checkbox" className="size-4 shrink-0 cursor-pointer accent-[var(--color-brand-500)]" checked={saveToAccount} onChange={(e) => setSaveToAccount(e.target.checked)} />
              Salvar este endereço na minha conta
            </label>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" form={formId} size="lg" className="w-full sm:w-auto">
              Usar este endereço
            </Button>
            {hasOptions && (
              <Button variant="secondary" size="lg" className="w-full sm:w-auto" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={STEEL_ROW}>
          Adicionar novo endereço
          <Plus className="size-4 shrink-0 text-muted transition-colors duration-150 group-hover:text-fg" strokeWidth={1.75} aria-hidden />
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

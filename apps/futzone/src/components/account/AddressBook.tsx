'use client';

import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Address } from '@/types/commerce';
import { useCustomerAuth, useCurrentCustomer } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { AddressCard } from './AddressCard';
import { AddressForm } from './AddressForm';
import { AccountHeading } from './AccountUI';

/** Aplica a regra de endereço principal único. */
export function upsertAddress(list: Address[], address: Address): Address[] {
  const exists = list.some((a) => a.id === address.id);
  let next = exists ? list.map((a) => (a.id === address.id ? address : a)) : [...list, address];
  if (address.isDefault || next.length === 1) next = next.map((a) => ({ ...a, isDefault: a.id === address.id }));
  if (!next.some((a) => a.isDefault) && next[0]) next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
  return next;
}

export function AddressBook() {
  const customer = useCurrentCustomer();
  const { saveAddresses } = useCustomerAuth();
  const { notify } = useToast();
  const [editing, setEditing] = useState<Partial<Address> | null>(null);
  const [removing, setRemoving] = useState<Address | null>(null);

  const addresses = [...customer.addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  const save = (address: Address) => {
    const isNew = !customer.addresses.some((a) => a.id === address.id);
    saveAddresses(upsertAddress(customer.addresses, address));
    setEditing(null);
    notify(isNew ? 'Endereço adicionado.' : 'Endereço atualizado.');
  };

  const setDefault = (id: string) => {
    saveAddresses(customer.addresses.map((a) => ({ ...a, isDefault: a.id === id })));
    notify('Endereço principal atualizado.');
  };

  const confirmRemove = () => {
    if (!removing) return;
    let list = customer.addresses.filter((a) => a.id !== removing.id);
    if (removing.isDefault && list[0]) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
    saveAddresses(list);
    setRemoving(null);
    notify('Endereço removido.', 'info');
  };

  return (
    <div>
      <AccountHeading
        title="Meus endereços"
        description="O endereço principal já vem escolhido no checkout."
        aside={
          addresses.length > 0 && (
            <Button onClick={() => setEditing({ isDefault: customer.addresses.length === 0 })}>
              <Plus className="size-4" strokeWidth={1.75} aria-hidden /> Novo endereço
            </Button>
          )
        }
      />

      {addresses.length === 0 ? (
        <EmptyState
          headingLevel="h2"
          icon={<MapPin className="size-6" strokeWidth={1.75} />}
          title="Nenhum endereço cadastrado"
          description="Cadastre um endereço para finalizar suas compras mais rápido."
          action={<Button onClick={() => setEditing({ isDefault: true })}>Adicionar endereço</Button>}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:gap-4">
          {addresses.map((a) => (
            <li key={a.id}>
              <AddressCard
                address={a}
                actions={
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(a)}>
                      <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden /> Editar
                    </Button>
                    {!a.isDefault && (
                      <Button size="sm" variant="ghost" onClick={() => setDefault(a.id)}>
                        Tornar principal
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="ml-auto px-2.5! hover:text-danger!" onClick={() => setRemoving(a)} aria-label={`Excluir endereço ${a.label}`}>
                      <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                    </Button>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar endereço' : 'Novo endereço'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" form="address-form">Salvar endereço</Button>
          </>
        }
      >
        {editing && <AddressForm key={editing.id ?? 'novo'} formId="address-form" hideActions initial={editing} defaultRecipient={customer.name} onSubmit={save} />}
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="Excluir endereço?"
        description={`O endereço "${removing?.label}" será excluído.`}
        confirmLabel="Excluir"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

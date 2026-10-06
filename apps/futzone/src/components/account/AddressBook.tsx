'use client';

import { useState } from 'react';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import type { Address } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';

const EMPTY: Address = { id: '', label: '', recipient: '', street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', isDefault: false };

const REQUIRED: Array<keyof Address> = ['label', 'recipient', 'street', 'number', 'district', 'city', 'state', 'zip'];

export function AddressBook() {
  const { customer, saveCustomer } = useStoreData();
  const { notify } = useToast();
  const [editing, setEditing] = useState<Address | null>(null);
  const [removing, setRemoving] = useState<Address | null>(null);
  const [errors, setErrors] = useState<Set<keyof Address>>(new Set());

  const save = (addresses: Address[]) => saveCustomer({ ...customer, addresses });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const missing = new Set(REQUIRED.filter((k) => !String(editing[k] ?? '').trim()));
    if (!/^\d{5}-?\d{3}$/.test(editing.zip)) missing.add('zip');
    setErrors(missing);
    if (missing.size) return;
    const isNew = !editing.id;
    const address = { ...editing, id: editing.id || `a-${Date.now().toString(36)}`, state: editing.state.toUpperCase() };
    let list = isNew ? [...customer.addresses, address] : customer.addresses.map((a) => (a.id === address.id ? address : a));
    if (address.isDefault || list.length === 1) list = list.map((a) => ({ ...a, isDefault: a.id === address.id }));
    save(list);
    setEditing(null);
    notify(isNew ? 'Endereço adicionado.' : 'Endereço atualizado.');
  };

  const setDefault = (id: string) => save(customer.addresses.map((a) => ({ ...a, isDefault: a.id === id })));

  const confirmRemove = () => {
    if (!removing) return;
    let list = customer.addresses.filter((a) => a.id !== removing.id);
    if (removing.isDefault && list[0]) list = list.map((a, i) => ({ ...a, isDefault: i === 0 }));
    save(list);
    setRemoving(null);
    notify('Endereço removido.');
  };

  const field = (key: keyof Address, label: string, opts: { className?: string; placeholder?: string; optional?: boolean } = {}) => (
    <Field label={opts.optional ? `${label} (opcional)` : label} error={errors.has(key) ? 'Campo obrigatório ou inválido.' : undefined} className={opts.className}>
      {(id, d) => (
        <Input
          id={id}
          aria-describedby={d}
          aria-invalid={errors.has(key)}
          placeholder={opts.placeholder}
          value={String(editing?.[key] ?? '')}
          onChange={(e) => setEditing((a) => (a ? { ...a, [key]: e.target.value } : a))}
        />
      )}
    </Field>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="heading-display text-4xl">Endereços</h2>
        <Button onClick={() => { setErrors(new Set()); setEditing({ ...EMPTY, recipient: customer.name }); }}>
          <Plus className="size-4" /> Novo endereço
        </Button>
      </div>

      {customer.addresses.length === 0 ? (
        <EmptyState icon={<MapPin className="size-6" />} title="Nenhum endereço cadastrado" description="Adicione um endereço para usar quando o checkout estiver disponível." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {customer.addresses.map((a) => (
            <li key={a.id} className={`flex flex-col rounded-2xl border bg-surface p-5 ${a.isDefault ? 'border-brand-500/60' : 'border-line'}`}>
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="size-4 text-brand-400" />
                <p className="font-bold">{a.label}</p>
                {a.isDefault && <Badge tone="brand">Principal</Badge>}
              </div>
              <p className="text-sm text-fg-2">{a.recipient}</p>
              <p className="text-sm text-muted">
                {a.street}, {a.number}{a.complement && ` — ${a.complement}`}<br />
                {a.district} · {a.city}/{a.state}<br />CEP {a.zip}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <Button size="sm" variant="secondary" onClick={() => { setErrors(new Set()); setEditing(a); }}>
                  <Pencil className="size-3.5" /> Editar
                </Button>
                {!a.isDefault && (
                  <Button size="sm" variant="ghost" onClick={() => setDefault(a.id)}>
                    <Star className="size-3.5" /> Tornar principal
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="ml-auto hover:text-danger" onClick={() => setRemoving(a)} aria-label={`Remover endereço ${a.label}`}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
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
        <form id="address-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-6">
          {field('label', 'Identificação', { className: 'sm:col-span-2', placeholder: 'Casa, Trabalho…' })}
          {field('recipient', 'Destinatário', { className: 'sm:col-span-4' })}
          {field('zip', 'CEP', { className: 'sm:col-span-2', placeholder: '00000-000' })}
          {field('street', 'Rua', { className: 'sm:col-span-4' })}
          {field('number', 'Número', { className: 'sm:col-span-2' })}
          {field('complement', 'Complemento', { className: 'sm:col-span-4', optional: true })}
          {field('district', 'Bairro', { className: 'sm:col-span-2' })}
          {field('city', 'Cidade', { className: 'sm:col-span-3' })}
          {field('state', 'UF', { className: 'sm:col-span-1', placeholder: 'RJ' })}
          <label className="flex items-center gap-2 text-sm text-fg-2 sm:col-span-6">
            <input type="checkbox" className="size-4 accent-[var(--color-brand-500)]" checked={!!editing?.isDefault} onChange={(e) => setEditing((a) => (a ? { ...a, isDefault: e.target.checked } : a))} />
            Usar como endereço principal
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="Remover endereço?"
        description={`O endereço "${removing?.label}" será removido.`}
        confirmLabel="Remover"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

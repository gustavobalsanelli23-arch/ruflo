'use client';

import { useEffect, useState } from 'react';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';

type FormState = { name: string; email: string; phone: string; cpf: string; birthDate: string };

export function PersonalDataForm() {
  const { customer, saveCustomer, hydrated } = useStoreData();
  const { notify } = useToast();
  const toForm = (): FormState => ({ name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf, birthDate: customer.birthDate });
  const [form, setForm] = useState<FormState>(toForm);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(toForm()), [hydrated, customer]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Partial<FormState> = {};
    if (form.name.trim().length < 3) next.name = 'Informe o nome completo.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'E-mail inválido.';
    if (form.phone.replace(/\D/g, '').length < 10) next.phone = 'Telefone inválido.';
    setErrors(next);
    if (Object.keys(next).length) return;
    saveCustomer({ ...customer, ...form, name: form.name.trim() });
    notify('Dados atualizados (salvos neste navegador).');
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <h2 className="heading-display text-4xl">Dados pessoais</h2>
      <div className="grid gap-5 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Nome completo" error={errors.name} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.name} value={form.name} onChange={set('name')} autoComplete="name" />}
        </Field>
        <Field label="E-mail" error={errors.email}>
          {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!errors.email} value={form.email} onChange={set('email')} autoComplete="email" />}
        </Field>
        <Field label="Telefone" error={errors.phone}>
          {(id, d) => <Input id={id} type="tel" aria-describedby={d} aria-invalid={!!errors.phone} value={form.phone} onChange={set('phone')} autoComplete="tel" />}
        </Field>
        <Field label="CPF" hint="Não pode ser alterado nesta demonstração.">
          {(id, d) => <Input id={id} aria-describedby={d} value={form.cpf} disabled />}
        </Field>
        <Field label="Data de nascimento">
          {(id) => <Input id={id} type="date" value={form.birthDate} onChange={set('birthDate')} />}
        </Field>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => { setForm(toForm()); setErrors({}); }}>
          Descartar
        </Button>
        <Button type="submit">Salvar alterações</Button>
      </div>
    </form>
  );
}

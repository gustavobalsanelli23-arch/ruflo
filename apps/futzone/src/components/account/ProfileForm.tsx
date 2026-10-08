'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { useCustomerAuth, useCurrentCustomer } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCPF, formatPhone, isValidCPF, isValidEmail, isValidFullName, isValidMobile, onlyDigits } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';

type Form = { name: string; email: string; phone: string; cpf: string };

/** Dados pessoais (endereços ficam separados em "Meus endereços"). */
export function ProfileForm() {
  const customer = useCurrentCustomer();
  const { updateProfile } = useCustomerAuth();
  const { notify } = useToast();
  const initial = (): Form => ({ name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf });
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(initial()), [customer.id]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial());

  const set = (key: keyof Form, format?: (v: string) => string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: format ? format(e.target.value) : e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Partial<Form> = {};
    if (!isValidFullName(form.name)) next.name = 'Informe nome e sobrenome.';
    if (!isValidEmail(form.email)) next.email = 'E-mail inválido.';
    if (!isValidMobile(form.phone)) next.phone = 'Celular inválido. Use DDD + 9 dígitos.';
    // CPF só é validado quando alterado (dados de exemplo usam números fictícios).
    if (onlyDigits(form.cpf) !== onlyDigits(customer.cpf) && !isValidCPF(form.cpf)) next.cpf = 'CPF inválido.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    const result = await updateProfile(form);
    setSaving(false);
    if (!result.ok) {
      if (result.field === 'email') setErrors({ email: result.message });
      else notify(result.message, 'warning');
      return;
    }
    notify('Dados atualizados.');
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <h2 className="heading-display text-4xl">Dados pessoais</h2>
        <p className="mt-1 text-sm text-muted">Usados na identificação dos seus pedidos e na nota fiscal.</p>
      </div>
      <div className="grid gap-5 rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06] sm:grid-cols-2 sm:p-6">
        <Field label="Nome completo" required error={errors.name} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.name} value={form.name} onChange={set('name')} autoComplete="name" />}
        </Field>
        <Field label="E-mail" required error={errors.email} hint="Também é o seu login.">
          {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!errors.email} value={form.email} onChange={set('email')} autoComplete="email" />}
        </Field>
        <Field label="Celular" required error={errors.phone}>
          {(id, d) => <Input id={id} type="tel" inputMode="numeric" aria-describedby={d} aria-invalid={!!errors.phone} value={form.phone} onChange={set('phone', formatPhone)} autoComplete="tel-national" />}
        </Field>
        <Field label="CPF" required error={errors.cpf}>
          {(id, d) => <Input id={id} inputMode="numeric" aria-describedby={d} aria-invalid={!!errors.cpf} value={form.cpf} onChange={set('cpf', formatCPF)} />}
        </Field>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted">
        <MapPin className="size-4 text-brand-400" /> Endereços de entrega ficam em{' '}
        <Link href="/conta/enderecos" className="font-semibold text-brand-300 hover:underline">Meus endereços</Link>.
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" disabled={!dirty || saving} onClick={() => { setForm(initial()); setErrors({}); }}>
          Descartar
        </Button>
        <Button type="submit" loading={saving} disabled={!dirty}>Salvar alterações</Button>
      </div>
    </form>
  );
}

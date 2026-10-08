'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogIn, UserPlus, UserRound } from 'lucide-react';
import type { Customer } from '@/types/commerce';
import { formatCPF, formatPhone, isValidCPF, isValidEmail, isValidFullName, isValidMobile, maskCPF } from '@/lib/validation';
import { Button, LinkButton } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import type { GuestContact } from './useCheckoutDraft';

interface Props {
  customer: Customer | null;
  guest: GuestContact | null;
  allowGuest: boolean;
  onGuest(contact: GuestContact): void;
  onContinue(): void;
  onLogout(): void;
}

export function IdentificationStep({ customer, guest, allowGuest, onGuest, onContinue, onLogout }: Props) {
  const [showGuest, setShowGuest] = useState(!!guest);
  const [form, setForm] = useState<GuestContact>(guest ?? { name: '', email: '', phone: '', cpf: '' });
  const [errors, setErrors] = useState<Partial<GuestContact>>({});

  if (customer) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-xl bg-white/[0.03] p-4">
          <UserRound className="mt-0.5 size-5 shrink-0 text-brand-400" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-fg">{customer.name}</p>
            <p className="text-fg-2">{customer.email}</p>
            <p className="text-muted">
              {customer.phone} · CPF {maskCPF(customer.cpf)}
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onLogout} className="text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
            Não é você? Sair
          </button>
          <Button size="lg" onClick={onContinue} className="w-full sm:w-auto">Continuar</Button>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Partial<GuestContact> = {};
    if (!isValidFullName(form.name)) er.name = 'Informe nome e sobrenome.';
    if (!isValidEmail(form.email)) er.email = 'E-mail inválido.';
    if (!isValidMobile(form.phone)) er.phone = 'Celular inválido (DDD + 9 dígitos).';
    if (!isValidCPF(form.cpf)) er.cpf = 'CPF inválido.';
    setErrors(er);
    if (Object.keys(er).length) return;
    onGuest({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() });
  };

  const next = encodeURIComponent('/checkout');

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <LinkButton href={`/login?next=${next}`} size="lg" block>
          <LogIn className="size-4" /> Entrar na minha conta
        </LinkButton>
        <LinkButton href={`/cadastro?next=${next}`} size="lg" block variant="outline">
          <UserPlus className="size-4" /> Criar conta
        </LinkButton>
      </div>

      {allowGuest ? (
        !showGuest ? (
          <button type="button" onClick={() => setShowGuest(true)} className="w-full rounded-xl border border-dashed border-line-strong px-4 py-3.5 text-sm font-semibold text-fg-2 transition-colors hover:border-fg-2 hover:text-fg">
            Continuar como visitante
          </button>
        ) : (
          <form onSubmit={submit} noValidate className="animate-fade-up space-y-4 rounded-xl bg-white/[0.03] p-4 sm:p-5">
            <p className="text-sm font-semibold text-fg">Comprar como visitante</p>
            <Field label="Nome completo" required error={errors.name}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.name} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            </Field>
            <Field label="E-mail" required error={errors.email} hint="Enviaremos as atualizações do pedido para este e-mail.">
              {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!errors.email} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Celular" required error={errors.phone}>
                {(id, d) => <Input id={id} type="tel" inputMode="numeric" aria-describedby={d} aria-invalid={!!errors.phone} autoComplete="tel-national" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} />}
              </Field>
              <Field label="CPF" required error={errors.cpf} hint="Necessário para a nota fiscal.">
                {(id, d) => <Input id={id} inputMode="numeric" aria-describedby={d} aria-invalid={!!errors.cpf} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} />}
              </Field>
            </div>
            <Button type="submit" size="lg" block>Continuar</Button>
            <p className="text-xs text-muted">
              Dica: com uma conta você acompanha o pedido e salva endereços. <Link href={`/cadastro?next=${next}`} className="text-brand-300 hover:underline">Criar conta</Link>
            </p>
          </form>
        )
      ) : (
        <p className="rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-muted">Para finalizar a compra, entre ou crie sua conta — leva menos de um minuto.</p>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import type { Customer } from '@/types/commerce';
import { formatCPF, formatPhone, isValidCPF, isValidEmail, isValidFullName, isValidMobile, maskCPF } from '@/lib/validation';
import { Button, LinkButton } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { STEEL_ROW } from './styles';
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
  // Só foca o primeiro campo quando o visitante acabou de escolher esse caminho.
  const [focusFirst, setFocusFirst] = useState(false);
  const [form, setForm] = useState<GuestContact>(guest ?? { name: '', email: '', phone: '', cpf: '' });
  const [errors, setErrors] = useState<Partial<GuestContact>>({});

  if (customer) {
    return (
      <div className="space-y-6">
        <div className="text-sm leading-relaxed">
          <p className="font-semibold text-fg">{customer.name}</p>
          <p className="text-fg-2 [overflow-wrap:anywhere]">{customer.email}</p>
          <p className="tabular-nums text-muted">
            {customer.phone}, CPF {maskCPF(customer.cpf)}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center self-start rounded-[var(--radius-button)] px-1 text-sm text-muted underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:self-auto"
          >
            Não é você? Sair
          </button>
          <Button size="lg" onClick={onContinue} className="w-full sm:w-auto">
            Continuar
          </Button>
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
          <LogIn className="size-4" strokeWidth={1.75} aria-hidden /> Entrar na minha conta
        </LinkButton>
        <LinkButton href={`/cadastro?next=${next}`} size="lg" block variant="outline">
          <UserPlus className="size-4" strokeWidth={1.75} aria-hidden /> Criar conta
        </LinkButton>
      </div>

      {allowGuest ? (
        <div className="border-t border-line pt-5">
          {!showGuest ? (
            <button
              type="button"
              onClick={() => {
                setShowGuest(true);
                setFocusFirst(true);
              }}
              className={STEEL_ROW}
            >
              Continuar como visitante
              <ArrowRight className="size-4 shrink-0 text-muted transition-colors duration-150 group-hover:text-fg" strokeWidth={1.75} aria-hidden />
            </button>
          ) : (
            <form onSubmit={submit} noValidate className="animate-fade space-y-4">
              <h3 className="text-sm font-semibold text-fg">Comprar como visitante</h3>
              <Field label="Nome completo" required error={errors.name}>
                {(id, d) => (
                  <Input
                    id={id}
                    autoFocus={focusFirst}
                    aria-describedby={d}
                    aria-invalid={!!errors.name}
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                )}
              </Field>
              <Field label="E-mail" required error={errors.email} hint="Enviaremos as atualizações do pedido para este e-mail.">
                {(id, d) => <Input id={id} type="email" aria-describedby={d} aria-invalid={!!errors.email} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Celular" required error={errors.phone}>
                  {(id, d) => (
                    <Input
                      id={id}
                      type="tel"
                      inputMode="numeric"
                      aria-describedby={d}
                      aria-invalid={!!errors.phone}
                      autoComplete="tel-national"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="CPF" required error={errors.cpf} hint="Necessário para a nota fiscal.">
                  {(id, d) => <Input id={id} inputMode="numeric" aria-describedby={d} aria-invalid={!!errors.cpf} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} />}
                </Field>
              </div>
              <Button type="submit" size="lg" block>
                Continuar
              </Button>
              <p className="text-xs leading-relaxed text-muted">
                Com uma conta você acompanha o pedido e salva endereços.{' '}
                <Link href={`/cadastro?next=${next}`} className="font-semibold text-fg underline decoration-fg/30 underline-offset-[3px] transition-[text-decoration-color] duration-150 hover:decoration-fg">
                  Criar conta
                </Link>
              </p>
            </form>
          )}
        </div>
      ) : (
        <p className="border-t border-line pt-5 text-sm text-muted">Para finalizar a compra, entre ou crie sua conta.</p>
      )}
    </div>
  );
}

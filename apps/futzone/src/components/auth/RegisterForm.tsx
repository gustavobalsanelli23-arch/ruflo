'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, UserPlus } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { customerPasswordProblems, formatCPF, formatPhone, isValidCPF, isValidEmail, isValidFullName, isValidMobile } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { PasswordStrength } from '@/components/forms/PasswordStrength';

type Form = { name: string; email: string; phone: string; cpf: string; password: string; confirm: string; terms: boolean };
type Errors = Partial<Record<keyof Form, string>>;

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = 'Informe seu nome completo.';
  else if (!isValidFullName(f.name)) e.name = 'Digite nome e sobrenome.';
  if (!f.email.trim()) e.email = 'Informe seu e-mail.';
  else if (!isValidEmail(f.email)) e.email = 'E-mail inválido. Ex.: nome@email.com';
  if (!f.phone.trim()) e.phone = 'Informe seu celular.';
  else if (!isValidMobile(f.phone)) e.phone = 'Celular inválido. Use DDD + 9 dígitos.';
  if (!f.cpf.trim()) e.cpf = 'Informe seu CPF.';
  else if (!isValidCPF(f.cpf)) e.cpf = 'CPF inválido. Confira os números.';
  const pw = customerPasswordProblems(f.password);
  if (!f.password) e.password = 'Crie uma senha.';
  else if (pw.length) e.password = `A senha precisa de: ${pw.join(', ')}.`;
  if (!f.confirm) e.confirm = 'Confirme a senha.';
  else if (f.confirm !== f.password) e.confirm = 'As senhas não são iguais.';
  if (!f.terms) e.terms = 'Para criar a conta, aceite os termos e a política de privacidade.';
  return e;
}

export function RegisterForm({ next, defaultEmail = '' }: { next: string; defaultEmail?: string }) {
  const router = useRouter();
  const { register } = useCustomerAuth();
  const { notify } = useToast();
  const [form, setForm] = useState<Form>({ name: '', email: defaultEmail, phone: '', cpf: '', password: '', confirm: '', terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Set<keyof Form>>(new Set());
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    if (touched.has(key) || errors[key]) setErrors((prev) => ({ ...prev, [key]: validate(nextForm)[key] }));
  };
  const blur = (key: keyof Form) => () => {
    setTouched((t) => new Set(t).add(key));
    setErrors((prev) => ({ ...prev, [key]: validate(form)[key] }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setTouched(new Set(Object.keys(form) as Array<keyof Form>));
    if (Object.keys(found).length) {
      document.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
      return;
    }
    setLoading(true);
    setFormError(null);
    const result = await register({ name: form.name, email: form.email, phone: form.phone, cpf: form.cpf, password: form.password });
    setLoading(false);
    if (!result.ok) {
      if (result.field === 'email') setErrors((prev) => ({ ...prev, email: result.message }));
      else setFormError(result.message);
      return;
    }
    notify('Conta criada! Boas-vindas à FutZone.');
    router.replace(next);
  };

  const input = (key: 'name' | 'email' | 'phone' | 'cpf', props: React.InputHTMLAttributes<HTMLInputElement>, format?: (v: string) => string) => (id: string, describedBy?: string) => (
    <Input
      id={id}
      name={key}
      aria-describedby={describedBy}
      value={form[key]}
      onChange={(e) => set(key, format ? format(e.target.value) : e.target.value)}
      onBlur={blur(key)}
      aria-invalid={!!errors[key]}
      aria-required
      {...props}
    />
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <p className="text-xs text-muted">
        Campos com <span className="text-brand-400">*</span> são obrigatórios.
      </p>
      {formError && (
        <div role="alert" className="animate-fade-up flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> {formError}
        </div>
      )}
      <Field label="Nome completo" required error={errors.name}>
        {input('name', { autoComplete: 'name', placeholder: 'Seu nome e sobrenome' })}
      </Field>
      <Field label="E-mail" required error={errors.email}>
        {input('email', { type: 'email', autoComplete: 'email', inputMode: 'email', autoCapitalize: 'none', placeholder: 'voce@email.com' })}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Celular" required error={errors.phone}>
          {input('phone', { type: 'tel', autoComplete: 'tel-national', inputMode: 'numeric', placeholder: '(11) 91234-5678' }, formatPhone)}
        </Field>
        <Field label="CPF" required error={errors.cpf}>
          {input('cpf', { inputMode: 'numeric', placeholder: '000.000.000-00' }, formatCPF)}
        </Field>
      </div>
      <Field label="Senha" required error={errors.password}>
        {(id, d) => (
          <PasswordInput
            id={id}
            name="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            onBlur={blur('password')}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-required
            aria-describedby={[d, 'reg-strength'].filter(Boolean).join(' ')}
          />
        )}
      </Field>
      <PasswordStrength id="reg-strength" password={form.password} />
      <Field label="Confirmar senha" required error={errors.confirm}>
        {(id, d) => (
          <PasswordInput
            id={id}
            name="confirm"
            aria-describedby={d}
            value={form.confirm}
            onChange={(e) => set('confirm', e.target.value)}
            onBlur={blur('confirm')}
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            aria-required
          />
        )}
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm text-fg-2">
          <input
            name="terms"
            type="checkbox"
            checked={form.terms}
            onChange={(e) => set('terms', e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-500)]"
            aria-invalid={!!errors.terms}
          />
          <span>
            Li e aceito os{' '}
            <Link href="/politicas#termos" className="text-brand-300 underline-offset-4 hover:underline">termos de uso</Link> e a{' '}
            <Link href="/politicas#privacidade" className="text-brand-300 underline-offset-4 hover:underline">política de privacidade</Link>.
          </span>
        </label>
        {errors.terms && <p role="alert" className="mt-1.5 text-xs text-danger">{errors.terms}</p>}
      </div>
      <Button type="submit" size="lg" block loading={loading}>
        {!loading && <UserPlus className="size-4" />} {loading ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  );
}

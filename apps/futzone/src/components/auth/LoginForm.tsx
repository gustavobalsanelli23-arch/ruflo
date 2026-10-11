'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { isValidEmail } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { TEXT_LINK } from '@/components/account/AccountUI';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { login, loginDemo, mode } = useCustomerAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const finish = () => {
    setState('success');
    window.setTimeout(() => router.replace(next), 450);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof fieldErrors = {};
    if (!isValidEmail(email)) errs.email = 'Informe um e-mail válido.';
    if (!password) errs.password = 'Informe sua senha.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setState('loading');
    setError(null);
    const result = await login(email, password);
    if (!result.ok) {
      setState('idle');
      setError(result.message);
      setPassword('');
      return;
    }
    finish();
  };

  const demo = async () => {
    setState('loading');
    await loginDemo();
    finish();
  };

  if (state === 'success') {
    return (
      <div role="status" className="animate-fade flex items-start gap-3">
        <Check className="mt-0.5 size-5 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
        <div>
          <p className="font-semibold text-fg">Login realizado!</p>
          <p className="mt-0.5 text-sm text-muted">Redirecionando…</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && (
        <div role="alert" className="animate-fade flex items-start gap-3 rounded-[var(--radius-card)] border border-danger/40 bg-danger/[0.08] px-4 py-3 text-sm text-fg">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.75} aria-hidden />
          <span>{error}</span>
        </div>
      )}
      <Field label="E-mail" error={fieldErrors.email}>
        {(id, d) => (
          <Input
            id={id}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            placeholder="voce@email.com"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={d}
            autoFocus
          />
        )}
      </Field>
      <div>
        <Field label="Senha" error={fieldErrors.password}>
          {(id, d) => <PasswordInput id={id} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-invalid={!!fieldErrors.password} aria-describedby={d} />}
        </Field>
        <p className="mt-3 text-right text-sm">
          <Link href="/recuperar-senha" className={TEXT_LINK}>
            Esqueci minha senha
          </Link>
        </p>
      </div>
      <Button type="submit" size="lg" block loading={state === 'loading'}>
        {state === 'loading' ? 'Entrando…' : 'Entrar'}
      </Button>
      {mode === 'demo' && (
        <div className="border-t border-line pt-5">
          {/* Caminho alternativo: placa de aço em caixa normal, para o rótulo caber numa linha no celular */}
          <Button variant="outline" block onClick={demo} disabled={state === 'loading'} className="px-3! text-sm! normal-case! tracking-normal!">
            Explorar com a conta de demonstração
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted">Conta de exemplo com pedidos, endereços e rastreio simulados.</p>
        </div>
      )}
    </form>
  );
}

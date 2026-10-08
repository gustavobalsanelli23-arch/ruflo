'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, LogIn, Sparkles } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { isValidEmail } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { PasswordInput } from '@/components/forms/PasswordInput';

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
      <div role="status" className="animate-fade-up flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="animate-pop size-12 text-success" />
        <p className="font-semibold text-fg">Login realizado!</p>
        <p className="text-sm text-muted">Redirecionando…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && (
        <div role="alert" className="animate-fade-up flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> {error}
        </div>
      )}
      <Field label="E-mail" error={fieldErrors.email}>
        {(id) => (
          <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" inputMode="email" autoCapitalize="none" placeholder="voce@email.com" aria-invalid={!!fieldErrors.email} autoFocus />
        )}
      </Field>
      <Field label="Senha" error={fieldErrors.password}>
        {(id) => <PasswordInput id={id} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-invalid={!!fieldErrors.password} />}
      </Field>
      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-sm text-brand-300 underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" size="lg" block loading={state === 'loading'}>
        {state !== 'loading' && <LogIn className="size-4" />} {state === 'loading' ? 'Entrando…' : 'Entrar'}
      </Button>
      <p className="text-center text-sm text-muted">
        Não tem conta?{' '}
        <Link href={`/cadastro${next !== '/conta' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-300 underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
      {mode === 'demo' && (
        <div className="border-t border-white/[0.06] pt-5">
          <Button variant="outline" block onClick={demo} disabled={state === 'loading'}>
            <Sparkles className="size-4" /> Explorar com a conta de demonstração
          </Button>
          <p className="mt-2 text-center text-xs text-subtle">Conta de exemplo com pedidos, endereços e rastreio simulados.</p>
        </div>
      )}
    </form>
  );
}

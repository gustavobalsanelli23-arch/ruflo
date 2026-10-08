'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { isValidEmail } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';

/** E-mail → solicitação → confirmação (sem revelar se a conta existe). */
export function PasswordResetForm() {
  const { requestPasswordReset, mode } = useCustomerAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'sent'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    setError(null);
    setState('loading');
    await requestPasswordReset(email);
    setState('sent');
  };

  if (state === 'sent') {
    return (
      <div role="status" className="animate-fade-up flex flex-col items-center gap-4 py-4 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-brand-500/12 text-brand-400 ring-1 ring-brand-500/25">
          <MailCheck className="animate-pop size-7" />
        </span>
        <h2 className="text-xl font-bold text-fg">Verifique seu e-mail</h2>
        <p className="max-w-sm text-sm text-fg-2">
          Se existir uma conta com <b className="text-fg">{email}</b>, você receberá um link para criar uma nova senha. O link expira em pouco tempo.
        </p>
        {mode === 'demo' && (
          <p className="max-w-sm rounded-xl bg-warn/10 px-4 py-3 text-xs text-warn">
            Demonstração: o envio de e-mails ainda não está ativo, então nenhuma mensagem foi enviada.
          </p>
        )}
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-300 hover:underline">
          <ArrowLeft className="size-4" /> Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="E-mail da conta" error={error ?? undefined}>
        {(id) => (
          <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" autoCapitalize="none" placeholder="voce@email.com" aria-invalid={!!error} autoFocus />
        )}
      </Field>
      <Button type="submit" size="lg" block loading={state === 'loading'}>
        {state !== 'loading' && <Send className="size-4" />} {state === 'loading' ? 'Enviando…' : 'Enviar link de recuperação'}
      </Button>
      <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Voltar para o login
      </Link>
    </form>
  );
}

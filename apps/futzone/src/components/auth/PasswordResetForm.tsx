'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { isValidEmail } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { TEXT_LINK } from '@/components/account/AccountUI';

function BackToLogin() {
  return (
    <Link href="/login" className={`${TEXT_LINK} group inline-flex items-center gap-2 text-sm`}>
      <ArrowLeft className="motion-lift size-4 text-muted transition-[translate,color] duration-150 group-hover:-translate-x-0.5 group-hover:text-fg" strokeWidth={1.75} aria-hidden />
      Voltar para o login
    </Link>
  );
}

/** E-mail, solicitação e confirmação (sem revelar se a conta existe). */
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
      <div role="status" className="animate-fade">
        <h2 className="heading-display text-3xl text-fg">Verifique seu e-mail</h2>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-fg-2">
          Se existir uma conta com <b className="font-semibold text-fg [overflow-wrap:anywhere]">{email}</b>, você receberá um link para criar uma nova senha. O link expira em pouco tempo.
        </p>
        {mode === 'demo' && (
          <p className="mt-5 max-w-[60ch] rounded-[var(--radius-card)] border border-warn/35 bg-warn/[0.06] px-4 py-3 text-xs leading-relaxed text-fg-2">
            <b className="font-semibold text-warn">Demonstração:</b> o envio de e-mails ainda não está ativo, então nenhuma mensagem foi enviada.
          </p>
        )}
        <p className="mt-6">
          <BackToLogin />
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="E-mail da conta" error={error ?? undefined}>
        {(id, d) => (
          <Input
            id={id}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="voce@email.com"
            aria-invalid={!!error}
            aria-describedby={d}
            autoFocus
          />
        )}
      </Field>
      <Button type="submit" size="lg" block loading={state === 'loading'}>
        {state === 'loading' ? 'Enviando…' : 'Enviar link de recuperação'}
      </Button>
      <p className="border-t border-line pt-5">
        <BackToLogin />
      </p>
    </form>
  );
}

'use client';

import { useId, useRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { cn } from '@/lib/format';
import { AdminButton } from '../AdminUI';

const INPUT =
  'h-12 w-full rounded-xl border border-line bg-bg/60 pl-11 pr-4 text-sm text-fg placeholder:text-subtle transition-[border-color,box-shadow] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-danger';

/**
 * Formulário de login. A senha é enviada somente para /api/admin/login
 * (mesma origem, HTTPS em produção); a verificação acontece no servidor.
 */
export function AdminLoginForm({ next }: { next: string }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        setPassword('');
        window.location.replace(next);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Não foi possível entrar. Tente novamente.');
      setPassword('');
      passwordRef.current?.focus();
    } catch {
      setError('Sem conexão com o servidor. Verifique sua internet.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && (
        <div role="alert" className="animate-fade-up flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-fg">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor={`${id}-email`} className="text-xs font-semibold text-fg-2">
          E-mail
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@futzone.com.br"
            aria-invalid={!!error || undefined}
            className={INPUT}
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${id}-password`} className="text-xs font-semibold text-fg-2">
          Senha
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={passwordRef}
            id={`${id}-password`}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            aria-invalid={!!error || undefined}
            className={cn(INPUT, 'pr-12')}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-white/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <AdminButton type="submit" loading={loading} className="h-12 w-full text-sm">
        {loading ? 'Entrando…' : 'Entrar'}
      </AdminButton>
    </form>
  );
}

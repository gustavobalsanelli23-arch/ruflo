'use client';

import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound } from 'lucide-react';
import { hashPassword, passwordProblems } from '@/lib/auth/password';
import { AdminButton } from '../AdminUI';

/**
 * Gera o hash de uma senha de administrador 100% no navegador: a senha nunca é
 * enviada a lugar nenhum. Só o código resultante vai para a variável
 * FUTZONE_ADMIN_n_PASSWORD_HASH na Vercel.
 */
export function AdminHashGenerator({ title = 'Gerar hash de senha' }: { title?: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [hash, setHash] = useState('');
  const [busy, setBusy] = useState(false);
  const issues = password ? passwordProblems(password) : [];
  const mismatch = !!confirm && confirm !== password;

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issues.length || !password || confirm !== password) return;
    setBusy(true);
    setHash(await hashPassword(password));
    setPassword('');
    setConfirm('');
    setBusy(false);
  };

  const input = 'h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm focus:border-brand-500 focus:outline-none';
  return (
    <form onSubmit={generate} className="min-w-0 space-y-2 rounded-xl border border-white/[0.06] bg-bg/50 p-4">
      <label htmlFor="hash-pw" className="flex items-center gap-2 text-xs font-semibold text-fg-2">
        <KeyRound className="size-3.5 text-brand-400" /> {title}
      </label>
      <div className="relative">
        <input
          id="hash-pw"
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nova senha"
          className={`${input} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-fg"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <input
        aria-label="Confirme a nova senha"
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirme a nova senha"
        className={input}
      />
      {issues.length > 0 && <p className="text-xs text-warn">A senha precisa de: {issues.join(', ')}.</p>}
      {mismatch && <p className="text-xs text-warn">As senhas não conferem.</p>}
      <AdminButton type="submit" size="sm" loading={busy} disabled={!password || issues.length > 0 || confirm !== password}>
        Gerar código
      </AdminButton>
      {hash && <CopyOutput label="PASSWORD_HASH" value={hash} />}
    </form>
  );
}

export function CopyOutput({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-surface-2 px-2 py-1.5 text-[0.7rem] text-fg-2" title={value}>
        {value}
      </code>
      <AdminButton type="button" size="icon" variant="ghost" onClick={copy} aria-label={`Copiar ${label}`}>
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </AdminButton>
    </div>
  );
}

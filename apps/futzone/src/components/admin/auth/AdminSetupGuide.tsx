'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, ShieldAlert } from 'lucide-react';
import { hashPassword, passwordProblems } from '@/lib/auth/password';
import { toBase64Url } from '@/lib/auth/encoding';
import { AdminButton } from '../AdminUI';

/**
 * Exibido apenas enquanto NENHUM administrador estiver configurado no servidor.
 * O gerador roda 100% no navegador: a senha nunca é enviada a lugar nenhum;
 * só o hash resultante é copiado para as variáveis de ambiente.
 */
export function AdminSetupGuide({ problems }: { problems: string[] }) {
  const [password, setPassword] = useState('');
  const [hash, setHash] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const issues = password ? passwordProblems(password) : [];

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issues.length || !password) return;
    setBusy(true);
    setHash(await hashPassword(password));
    setPassword('');
    setBusy(false);
  };

  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value).catch(() => undefined);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
        <div>
          <p className="font-semibold text-fg">Acesso administrativo ainda não configurado</p>
          <p className="mt-1 text-xs text-fg-2">Por segurança, o painel fica bloqueado até as contas dos 2 administradores serem definidas no servidor.</p>
        </div>
      </div>
      {problems.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-xs text-danger">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed text-fg-2">
        <li>Cada administrador gera o hash da própria senha abaixo (a senha não sai deste navegador).</li>
        <li>
          Na Vercel: <b>Settings → Environment Variables</b>, crie <code className="text-brand-300">FUTZONE_ADMIN_1_EMAIL</code>, <code className="text-brand-300">FUTZONE_ADMIN_1_NAME</code>, <code className="text-brand-300">FUTZONE_ADMIN_1_PASSWORD_HASH</code> (e o mesmo com <code>_2_</code>).
        </li>
        <li>
          Crie <code className="text-brand-300">FUTZONE_ADMIN_SESSION_SECRET</code> com o segredo gerado abaixo e faça um novo deploy.
        </li>
      </ol>

      <form onSubmit={generate} className="space-y-2 rounded-xl border border-white/[0.06] bg-bg/50 p-4">
        <label htmlFor="setup-pw" className="flex items-center gap-2 text-xs font-semibold text-fg-2">
          <KeyRound className="size-3.5 text-brand-400" /> Gerar hash de senha
        </label>
        <input
          id="setup-pw"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha do administrador"
          className="h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm focus:border-brand-500 focus:outline-none"
        />
        {issues.length > 0 && <p className="text-xs text-warn">A senha precisa de: {issues.join(', ')}.</p>}
        <AdminButton type="submit" size="sm" loading={busy} disabled={!password || issues.length > 0}>
          Gerar hash
        </AdminButton>
        {hash && <Output label="PASSWORD_HASH" value={hash} copied={copied === 'hash'} onCopy={() => copy('hash', hash)} />}
      </form>

      <div className="space-y-2 rounded-xl border border-white/[0.06] bg-bg/50 p-4">
        <p className="text-xs font-semibold text-fg-2">Segredo de sessão (gerar uma única vez)</p>
        <AdminButton size="sm" variant="secondary" onClick={() => setSecret(toBase64Url(crypto.getRandomValues(new Uint8Array(48))))}>
          Gerar segredo
        </AdminButton>
        {secret && <Output label="SESSION_SECRET" value={secret} copied={copied === 'secret'} onCopy={() => copy('secret', secret)} />}
      </div>
    </div>
  );
}

function Output({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy(): void }) {
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-surface-2 px-2 py-1.5 text-[0.7rem] text-fg-2" title={value}>
        {value}
      </code>
      <AdminButton size="icon" variant="ghost" onClick={onCopy} aria-label={`Copiar ${label}`}>
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </AdminButton>
    </div>
  );
}

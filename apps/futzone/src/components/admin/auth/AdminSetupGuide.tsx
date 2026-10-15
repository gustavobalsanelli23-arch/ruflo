'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { toBase64Url } from '@/lib/auth/encoding';
import { AdminButton } from '../AdminUI';
import { AdminHashGenerator, CopyOutput } from './AdminHashGenerator';

/**
 * Exibido apenas enquanto NENHUM administrador estiver configurado no servidor.
 * O gerador roda 100% no navegador: a senha nunca é enviada a lugar nenhum;
 * só o hash resultante é copiado para as variáveis de ambiente.
 */
export function AdminSetupGuide({ problems }: { problems: string[] }) {
  const [secret, setSecret] = useState('');

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

      <AdminHashGenerator />

      <div className="space-y-2 rounded-xl border border-white/[0.06] bg-bg/50 p-4">
        <p className="text-xs font-semibold text-fg-2">Segredo de sessão (gerar uma única vez)</p>
        <AdminButton size="sm" variant="secondary" onClick={() => setSecret(toBase64Url(crypto.getRandomValues(new Uint8Array(48))))}>
          Gerar segredo
        </AdminButton>
        {secret && <CopyOutput label="SESSION_SECRET" value={secret} />}
      </div>
    </div>
  );
}

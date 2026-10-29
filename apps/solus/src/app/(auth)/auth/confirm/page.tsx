import type { Metadata } from 'next';
import Link from 'next/link';
import { MailCheck, KeyRound } from 'lucide-react';
import { Notice } from '@/components/data/states';
import { ConfirmLinkForm } from '@/modules/auth/confirm-link-form';
import { AuthHeading } from '@/modules/auth/form-kit';

export const metadata: Metadata = { title: 'Confirmar' };

const FORWARDED = ['token_hash', 'type', 'code', 'fluxo'] as const;

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const forwarded: Record<string, string> = {};
  for (const name of FORWARDED) {
    const value = params[name];
    if (typeof value === 'string' && value.length <= 256) forwarded[name] = value;
  }
  const recovery = forwarded.type === 'recovery' || forwarded.fluxo === 'recuperacao';
  // Supabase reports expired or reused links in the query string.
  const failed = typeof params.error_code === 'string' || typeof params.error === 'string';
  const usable = !failed && (Boolean(forwarded.token_hash && forwarded.type) || Boolean(forwarded.code));
  const Icon = recovery ? KeyRound : MailCheck;

  return (
    <>
      <Icon aria-hidden="true" className="mb-5 size-7 text-brand" strokeWidth={1.5} />
      <AuthHeading
        title={recovery ? 'Redefinir senha' : 'Confirmar e-mail'}
        description={recovery ? 'Continue para criar uma nova senha para a sua conta.' : 'Confirme o seu endereço para ativar a conta e entrar na SOLUS.'}
      />
      {usable ? (
        <ConfirmLinkForm params={forwarded} recovery={recovery} />
      ) : (
        <>
          <Notice tone="error" title="Este link não pode ser usado">
            Ele expirou, já foi usado ou está incompleto. Links de confirmação valem por 24 horas; os de recuperação, por 1 hora.
          </Notice>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href={recovery ? '/recuperar-senha' : '/entrar'} className="font-medium text-brand underline-offset-4 hover:underline">
              {recovery ? 'Pedir novo link' : 'Ir para entrar'}
            </Link>
          </div>
        </>
      )}
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Notice } from '@/components/data/states';
import { AuthHeading } from '@/modules/auth/form-kit';
import { ResetPasswordForm } from '@/modules/auth/recovery-forms';
import { hasRecoveryGrant } from '@/services/recovery';
import { getSessionUser } from '@/services/session';

export const metadata: Metadata = { title: 'Criar nova senha' };

export default async function ResetPasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect('/recuperar-senha?motivo=link-expirado');

  if (!(await hasRecoveryGrant(user.id))) {
    return (
      <>
        <AuthHeading title="Criar nova senha" />
        <Notice tone="warning" title="Abra o link enviado por e-mail">
          Por segurança, uma nova senha sem a senha atual só pode ser criada pelo link de recuperação, por até 15 minutos depois de aberto.
        </Notice>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/recuperar-senha" className="font-medium text-brand underline-offset-4 hover:underline">
            Pedir novo link
          </Link>
          <Link href="/configuracoes?secao=seguranca" className="font-medium text-brand underline-offset-4 hover:underline">
            Trocar a senha nas configurações
          </Link>
        </div>
      </>
    );
  }

  return <ResetPasswordForm email={user.email} />;
}

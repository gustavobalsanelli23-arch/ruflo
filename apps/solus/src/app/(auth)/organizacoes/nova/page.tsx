import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import { loginPath } from '@/lib/auth/redirect';
import { AuthHeading } from '@/modules/auth/form-kit';
import { CreateOrganizationForm } from '@/modules/organizations/create-organization-form';
import { SignedInAs } from '@/modules/organizations/signed-in-as';
import { loadWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Nova organização' };

export default async function NewOrganizationPage() {
  const workspace = await loadWorkspace();
  if (!workspace) redirect(loginPath({ next: '/organizacoes/nova', reason: 'sessao-expirada' }));
  const first = workspace.memberships.length === 0;

  return (
    <>
      <Building2 aria-hidden="true" className="mb-5 size-7 text-brand" strokeWidth={1.5} />
      <AuthHeading
        title={first ? 'Crie a organização da sua empresa' : 'Nova organização'}
        description={
          first
            ? 'Os dados, as análises e a equipe ficam dentro dela. Você será o proprietário e poderá convidar outras pessoas.'
            : 'Cada organização tem dados e equipe próprios. Você será o proprietário desta.'
        }
      />
      <CreateOrganizationForm />
      {first ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Recebeu um convite? Abra o link do convite para entrar na organização de quem convidou você.
        </p>
      ) : (
        workspace.active && (
          <p className="mt-6 text-sm">
            <Link href="/visao-geral" className="font-medium text-brand underline-offset-4 hover:underline">
              Voltar para {workspace.active.name}
            </Link>
          </p>
        )
      )}
      <SignedInAs email={workspace.user.email} />
    </>
  );
}

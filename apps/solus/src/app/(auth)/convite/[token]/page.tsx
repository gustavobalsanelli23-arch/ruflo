import type { Metadata } from 'next';
import { MailOpen } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Notice } from '@/components/data/states';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { loginPath } from '@/lib/auth/redirect';
import { logServerError } from '@/lib/log';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { AuthHeading } from '@/modules/auth/form-kit';
import { InvitationResponse } from '@/modules/organizations/invitation-response';
import { SignedInAs } from '@/modules/organizations/signed-in-as';
import { invitationTokenSchema } from '@/schemas/organization';
import { getSessionUser } from '@/services/session';

export const metadata: Metadata = { title: 'Convite' };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) redirect(loginPath({ next: `/convite/${token}` }));

  let invitation = null;
  if (invitationTokenSchema.safeParse(token).success) {
    const { data, error } = await supabase.rpc('get_invitation', { p_token: token });
    if (error) logServerError('convites: prévia', error);
    invitation = data?.[0] ?? null;
  }

  if (!invitation) {
    return (
      <>
        <MailOpen aria-hidden="true" className="mb-5 size-7 text-brand" strokeWidth={1.5} />
        <AuthHeading title="Convite não encontrado" />
        <Notice tone="warning" title="Este link não leva a nenhum convite" className="mb-6">
          Ele pode ter sido substituído por um convite mais novo ou revogado. Peça um novo link a quem convidou você.
        </Notice>
        <InvitationResponse token={token} canAccept={false} />
        <SignedInAs email={user.email} />
      </>
    );
  }

  const blocked =
    invitation.invitation_status === 'accepted'
      ? { title: 'Este convite já foi usado', body: 'Se foi você, a organização já aparece na sua lista.' }
      : invitation.invitation_status === 'expired'
        ? { title: 'Este convite expirou', body: 'Convites valem por 7 dias. Peça um novo link a quem convidou você.' }
        : !invitation.email_matches
          ? {
              title: 'Convite para outro e-mail',
              body: `Ele foi enviado para ${invitation.email_hint}. Saia e entre com a conta desse e-mail para aceitar.`,
            }
          : null;

  return (
    <>
      <MailOpen aria-hidden="true" className="mb-5 size-7 text-brand" strokeWidth={1.5} />
      <AuthHeading
        title={`Convite para ${invitation.organization_name}`}
        description={
          <>
            Você entrará como <strong className="font-medium text-foreground">{ROLE_LABEL[invitation.invited_role].toLowerCase()}</strong>. O
            convite vale até {formatDate(invitation.invitation_expires_at.slice(0, 10))}.
          </>
        }
      />
      {blocked && (
        <Notice tone="warning" title={blocked.title} className="mb-6">
          {blocked.body}
        </Notice>
      )}
      <InvitationResponse token={token} canAccept={!blocked} />
      <SignedInAs email={user.email} />
    </>
  );
}

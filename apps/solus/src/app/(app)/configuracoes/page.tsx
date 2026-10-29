import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/data/page-header';
import { can } from '@/lib/auth/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TenantSettings } from '@/modules/settings/tenant-settings';
import { getParameters } from '@/services/analytics';
import { listMembers, listPendingInvitations } from '@/services/organization-data';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Configurações' };

export default async function SettingsPage() {
  const { user, active } = await requireWorkspace();
  const supabase = await createSupabaseServerClient();
  const [members, invitations, analysis] = supabase
    ? await Promise.all([
        listMembers(supabase, active.organizationId),
        can(active.role, 'manageMembers') ? listPendingInvitations(supabase, active.organizationId) : Promise.resolve([]),
        getParameters(supabase, active.organizationId).catch(() => null),
      ])
    : [[], [], null];

  return (
    <>
      <PageHeader title="Configurações" description={`Organização ${active.name}, pessoas, parâmetros de análise e a segurança da sua conta.`} />
      <div className="mt-8">
        <Suspense>
          <TenantSettings
            data={{
              organization: { name: active.name, slug: active.slug },
              role: active.role,
              user: { id: user.id, email: user.email, fullName: user.fullName },
              members,
              invitations,
              analysis,
            }}
          />
        </Suspense>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { PageHeader } from '@/components/data/page-header';
import { can } from '@/lib/auth/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TenantDataHub } from '@/modules/data-hub/tenant/data-hub';
import { importIdSchema } from '@/schemas/imports';
import { listImportHistory } from '@/services/imports';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Dados' };

export default async function DataPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { active, user } = await requireWorkspace();
  const supabase = await createSupabaseServerClient();
  const history = supabase ? await listImportHistory(supabase, active.organizationId) : [];
  const requested = (await searchParams).continuar;
  const resume = importIdSchema.safeParse(Array.isArray(requested) ? requested[0] : requested);

  return (
    <>
      <PageHeader
        title="Dados"
        description="Planilhas de vendas, produtos, estoque e fornecedores. A SOLUS lê, valida e organiza tudo antes de usar nas análises."
      />
      <div className="mt-8">
        <TenantDataHub
          history={history}
          canImport={can(active.role, 'import')}
          canAdmin={can(active.role, 'manageImports')}
          userId={user.id}
          resumeId={resume.success && history.some((item) => item.id === resume.data) ? resume.data : null}
        />
      </div>
    </>
  );
}

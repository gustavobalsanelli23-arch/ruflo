import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageHeader } from '@/components/data/page-header';
import { getAiConfig } from '@/lib/ai/config';
import { can } from '@/lib/auth/permissions';
import { formatDateTime } from '@/lib/format';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LiveOpportunityCenter, RunAnalysisButton } from '@/modules/opportunities/live-center';
import { DataNotes } from '@/modules/workspace/data-notes';
import { ModuleEmpty } from '@/modules/workspace/module-empty';
import { loadBase } from '@/services/dashboards';
import { lastAnalysisRun, listOpportunities } from '@/services/opportunities';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Oportunidades' };

export default async function OpportunitiesPage() {
  const { active } = await requireWorkspace();
  const supabase = await createSupabaseServerClient();
  const canAnalyze = can(active.role, 'analyze');
  const [base, opportunities, run] = supabase
    ? await Promise.all([loadBase(supabase, active.organizationId), listOpportunities(supabase, active.organizationId), lastAnalysisRun(supabase, active.organizationId)])
    : [null, { items: [], names: {} }, null];

  const header = (
    <PageHeader
      title="Oportunidades"
      description="Ganhos encontrados nos dados da empresa por regras determinísticas, com a evidência e o plano de cada um."
      actions={base && canAnalyze ? <RunAnalysisButton /> : undefined}
    />
  );

  if (!base && opportunities.items.length === 0) {
    return (
      <>
        {header}
        <div className="mt-8">
          <ModuleEmpty module="opportunities" />
        </div>
      </>
    );
  }

  const limitations = Array.isArray(run?.limitations) ? (run.limitations as string[]) : [];
  return (
    <>
      {header}
      <div className="mt-6 flex flex-col gap-4">
        {run && (
          <p className="text-xs text-subtle-foreground">
            Última análise em <time dateTime={run.created_at}>{formatDateTime(run.created_at)}</time>: {run.detected_count} oportunidades detectadas,{' '}
            {run.created_count} novas, {run.resolved_count} resolvidas pelo sistema. Versão das regras: {run.engine_version}.
          </p>
        )}
        <DataNotes notes={limitations} title="O que a análise não pôde avaliar" />
      </div>
      <div className="mt-6">
        <Suspense>
          <LiveOpportunityCenter
            opportunities={opportunities.items}
            productNames={opportunities.names}
            canEdit={canAnalyze}
            explainWithAi={canAnalyze && getAiConfig() !== null}
          />
        </Suspense>
      </div>
    </>
  );
}

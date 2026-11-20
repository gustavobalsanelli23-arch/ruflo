import type { Metadata } from 'next';
import { formatDateTime } from '@/lib/format';
import { parsePeriod } from '@/lib/period';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Onboarding } from '@/modules/overview/onboarding';
import { MonthlyReport } from '@/modules/report/monthly-report';
import { reportFromTenant } from '@/modules/report/report-data';
import { loadBase, loadOverview } from '@/services/dashboards';
import { requireWorkspace } from '@/services/workspace';

export const metadata: Metadata = { title: 'Relatório' };

/** The printable report of the active organization, from the same metrics as the overview. */
export default async function ReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const workspace = await requireWorkspace();
  const supabase = await createSupabaseServerClient();
  const base = supabase ? await loadBase(supabase, workspace.active.organizationId) : null;
  if (!supabase || !base) return <Onboarding workspace={workspace} />;
  const key = parsePeriod((await searchParams).periodo);
  const data = await loadOverview(supabase, workspace.active.organizationId, base, key);
  return <MonthlyReport data={reportFromTenant(workspace.active.name, data)} generatedAt={formatDateTime(new Date().toISOString())} />;
}

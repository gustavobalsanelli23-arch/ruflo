import { AppShell } from '@/components/shell/app-shell';
import type { ShellContext } from '@/components/shell/types';
import { logServerError } from '@/lib/log';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCoverage } from '@/services/analytics';
import { requireWorkspace } from '@/services/workspace';

/**
 * The signed-in workspace. requireWorkspace() re-checks the session (the proxy
 * is not the only gate), sends people without an organization to onboarding
 * and resolves the active organization from their memberships.
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, active } = await requireWorkspace();
  const shellData = await loadShellData(active.organizationId);

  const context: ShellContext = {
    mode: 'tenant',
    basePath: '',
    organization: { id: active.organizationId, name: active.name, isDemo: false },
    role: active.role,
    memberships: memberships.map((m) => ({ organizationId: m.organizationId, name: m.name, role: m.role })),
    user: { name: user.displayName, email: user.email, initials: user.initials },
    dataThrough: shellData.dataThrough,
    openOpportunities: shellData.openOpportunities,
    quickOpportunities: shellData.quickOpportunities,
    // The analyst's questions arrive with the AI integration (Part 05).
    quickQuestions: [],
    signedIn: true,
  };

  return <AppShell context={context}>{children}</AppShell>;
}

/** Last day with data and the open opportunities, for the top bar and the command menu. */
async function loadShellData(organizationId: string) {
  const empty = { dataThrough: null, openOpportunities: 0, quickOpportunities: [] as { id: string; title: string }[] };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return empty;
  try {
    const [coverage, open] = await Promise.all([
      getCoverage(supabase, organizationId),
      supabase
        .from('opportunities')
        .select('id, title', { count: 'exact' })
        .eq('organization_id', organizationId)
        .in('status', ['new', 'reviewing', 'in_progress'])
        .order('impact_value', { ascending: false })
        .limit(5),
    ]);
    return {
      dataThrough: coverage.lastSale ?? coverage.lastSnapshot,
      openOpportunities: open.count ?? 0,
      quickOpportunities: (open.data ?? []).map((row) => ({ id: row.id, title: row.title })),
    };
  } catch (error) {
    logServerError('workspace: dados do cabeçalho', error);
    return empty;
  }
}

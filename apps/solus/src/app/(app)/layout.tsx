import { AppShell } from '@/components/shell/app-shell';
import type { ShellContext } from '@/components/shell/types';
import { requireWorkspace } from '@/services/workspace';

/**
 * The signed-in workspace. requireWorkspace() re-checks the session (the proxy
 * is not the only gate), sends people without an organization to onboarding
 * and resolves the active organization from their memberships.
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, memberships, active } = await requireWorkspace();

  const context: ShellContext = {
    mode: 'tenant',
    basePath: '',
    organization: { id: active.organizationId, name: active.name, isDemo: false },
    role: active.role,
    memberships: memberships.map((m) => ({ organizationId: m.organizationId, name: m.name, role: m.role })),
    user: { name: user.displayName, email: user.email, initials: user.initials },
    // No business data yet: these fill in with the analytics engine (Part 04).
    dataThrough: null,
    openOpportunities: 0,
    quickOpportunities: [],
    quickQuestions: [],
    signedIn: true,
  };

  return <AppShell context={context}>{children}</AppShell>;
}

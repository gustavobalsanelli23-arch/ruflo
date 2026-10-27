import { AppShell } from '@/components/shell/app-shell';
import type { ShellContext } from '@/components/shell/types';
import { getRepository } from '@/lib/data';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const repository = getRepository();
  const [workspace, opportunities, analyst] = await Promise.all([
    repository.getWorkspace(),
    repository.getOpportunities(),
    repository.getAnalyst(),
  ]);

  const context: ShellContext = {
    organization: {
      name: workspace.organization.name,
      segment: workspace.organization.segment,
      isDemo: workspace.organization.isDemo,
    },
    user: {
      name: workspace.user.name,
      email: workspace.user.email,
      initials: workspace.user.initials,
      jobTitle: workspace.user.jobTitle,
    },
    dataThrough: workspace.dataThrough,
    openOpportunities: workspace.openOpportunities,
    quickOpportunities: opportunities
      .filter((o) => o.status !== 'done' && o.status !== 'dismissed')
      .slice(0, 4)
      .map((o) => ({ id: o.id, title: o.title })),
    quickQuestions: analyst.suggestions.map((s) => ({ id: s.id, question: s.question })),
  };

  return <AppShell context={context}>{children}</AppShell>;
}

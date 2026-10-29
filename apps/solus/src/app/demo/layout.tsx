import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/app-shell';
import type { ShellContext } from '@/components/shell/types';
import { demoRepository } from '@/demo/repository';
import { demoAiEnabled } from '@/services/demo-ai';
import { getSessionUser } from '@/services/session';

export const metadata: Metadata = {
  title: { default: 'Demonstração', template: '%s · Demonstração | SOLUS' },
};

/** The demonstration: fictitious company, always labelled, isolated under /demo. */
export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const [workspace, opportunities, analyst, session] = await Promise.all([
    demoRepository.getWorkspace(),
    demoRepository.getOpportunities(),
    demoRepository.getAnalyst(),
    getSessionUser(),
  ]);

  const context: ShellContext = {
    mode: 'demo',
    basePath: '/demo',
    organization: { id: null, name: workspace.organization.name, isDemo: true },
    role: workspace.user.role,
    memberships: [],
    user: { name: workspace.user.name, email: workspace.user.email, initials: workspace.user.initials },
    dataThrough: workspace.dataThrough,
    openOpportunities: workspace.openOpportunities,
    quickOpportunities: opportunities
      .filter((o) => o.status !== 'done' && o.status !== 'dismissed')
      .slice(0, 4)
      .map((o) => ({ id: o.id, title: o.title })),
    quickQuestions: analyst.suggestions.map((s) => ({ id: s.id, question: s.question })),
    analyst: demoAiEnabled(),
    signedIn: session !== null,
  };

  return <AppShell context={context}>{children}</AppShell>;
}

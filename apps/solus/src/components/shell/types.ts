import type { Role } from '@/lib/data/types';

export interface ShellMembership {
  organizationId: string;
  name: string;
  role: Role;
}

/**
 * What the shell needs to render. Built by the workspace layout (real
 * organization, from Supabase) or by the demo layout (fictitious data).
 */
export interface ShellContext {
  mode: 'tenant' | 'demo';
  /** '' for the workspace, '/demo' for the demonstration. */
  basePath: '' | '/demo';
  organization: { id: string | null; name: string; isDemo: boolean };
  role: Role;
  memberships: ShellMembership[];
  user: { name: string; email: string; initials: string };
  /** Last day with data, or null while the organization has none. */
  dataThrough: string | null;
  openOpportunities: number;
  quickOpportunities: { id: string; title: string }[];
  quickQuestions: { id: string; question: string }[];
  /** Demo only: whether the visitor also has a session. */
  signedIn: boolean;
}

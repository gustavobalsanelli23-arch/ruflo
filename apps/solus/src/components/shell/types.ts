import type { Organization, UserProfile } from '@/lib/data/types';

export interface ShellContext {
  organization: Pick<Organization, 'name' | 'segment' | 'isDemo'>;
  user: Pick<UserProfile, 'name' | 'email' | 'initials' | 'jobTitle'>;
  dataThrough: string;
  openOpportunities: number;
  quickOpportunities: { id: string; title: string }[];
  quickQuestions: { id: string; question: string }[];
}

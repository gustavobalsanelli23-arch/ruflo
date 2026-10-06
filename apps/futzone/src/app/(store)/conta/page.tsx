import type { Metadata } from 'next';
import { AccountOverview } from '@/components/account/AccountViews';

export const metadata: Metadata = { title: 'Minha conta' };

export default function Page() {
  return <AccountOverview />;
}

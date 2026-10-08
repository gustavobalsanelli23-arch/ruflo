import type { Metadata } from 'next';
import { AccountDashboard } from '@/components/account/AccountDashboard';

export const metadata: Metadata = { title: 'Minha conta' };

export default function Page() {
  return <AccountDashboard />;
}

import type { Metadata } from 'next';
import { SecurityPanel } from '@/components/account/SecurityPanel';

export const metadata: Metadata = { title: 'Segurança' };

export default function Page() {
  return <SecurityPanel />;
}

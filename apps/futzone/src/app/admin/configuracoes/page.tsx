import type { Metadata } from 'next';
import { SettingsAdmin } from '@/components/admin/MiscAdmin';

export const metadata: Metadata = { title: 'Configurações' };

export default function Page() {
  return <SettingsAdmin />;
}

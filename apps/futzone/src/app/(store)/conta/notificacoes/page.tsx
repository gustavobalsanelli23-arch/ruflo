import type { Metadata } from 'next';
import { NotificationsView } from '@/components/account/NotificationsView';

export const metadata: Metadata = { title: 'Notificações' };

export default function Page() {
  return <NotificationsView />;
}

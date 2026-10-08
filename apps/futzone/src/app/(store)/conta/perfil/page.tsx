import type { Metadata } from 'next';
import { ProfileForm } from '@/components/account/ProfileForm';

export const metadata: Metadata = { title: 'Dados pessoais' };

export default function Page() {
  return <ProfileForm />;
}

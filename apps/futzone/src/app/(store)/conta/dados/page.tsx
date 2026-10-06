import type { Metadata } from 'next';
import { PersonalDataForm } from '@/components/account/PersonalDataForm';

export const metadata: Metadata = { title: 'Dados pessoais' };

export default function Page() {
  return <PersonalDataForm />;
}

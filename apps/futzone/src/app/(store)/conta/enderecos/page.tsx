import type { Metadata } from 'next';
import { AddressBook } from '@/components/account/AddressBook';

export const metadata: Metadata = { title: 'Meus endereços' };

export default function Page() {
  return <AddressBook />;
}

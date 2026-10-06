import type { Metadata } from 'next';
import { AddressBook } from '@/components/account/AddressBook';

export const metadata: Metadata = { title: 'Endereços' };

export default function Page() {
  return <AddressBook />;
}

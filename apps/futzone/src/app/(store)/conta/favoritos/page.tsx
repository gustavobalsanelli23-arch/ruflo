import type { Metadata } from 'next';
import { FavoritesView } from '@/components/account/FavoritesView';

export const metadata: Metadata = { title: 'Favoritos' };

export default function Page() {
  return <FavoritesView />;
}

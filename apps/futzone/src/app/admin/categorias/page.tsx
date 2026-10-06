import type { Metadata } from 'next';
import { CategoriesAdmin } from '@/components/admin/MiscAdmin';

export const metadata: Metadata = { title: 'Categorias' };

export default function Page() {
  return <CategoriesAdmin />;
}

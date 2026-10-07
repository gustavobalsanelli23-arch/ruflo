import type { Metadata } from 'next';
import { CategoriesAdmin } from '@/components/admin/CategoriesAdmin';

export const metadata: Metadata = { title: 'Categorias' };

export default function Page() {
  return <CategoriesAdmin />;
}

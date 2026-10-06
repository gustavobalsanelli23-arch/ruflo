import type { Metadata } from 'next';
import { StockAdmin } from '@/components/admin/StockAdmin';

export const metadata: Metadata = { title: 'Estoque' };

export default function Page() {
  return <StockAdmin />;
}

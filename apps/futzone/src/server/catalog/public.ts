import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';
import type { Product } from '@/types/catalog';
import { getPool } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';
import { queryPublicProducts } from './store';

/**
 * Catálogo público com cache: lido do banco no máximo a cada 5 minutos, ou logo
 * depois de uma sincronização, edição no painel ou baixa de estoque (tag
 * `catalogo`). O fornecedor nunca é consultado por visita.
 */
export const CATALOG_TAG = 'catalogo';

export const getPublicCatalog = unstable_cache(
  async (): Promise<Product[]> => {
    await ensureDatabase();
    return queryPublicProducts(getPool());
  },
  ['catalogo-publico-v2'],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

export function catalogChanged(): void {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

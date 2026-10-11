import { isDbConfigured } from '@/server/db/client';
import { getPublicCatalog } from '@/server/catalog/public';

export const dynamic = 'force-dynamic';

/**
 * Catálogo público da loja. Com banco: produtos publicados, com o estoque
 * vendável de cada tamanho. Sem banco: `local` (a loja usa o catálogo do arquivo).
 * Nunca inclui dados internos do fornecedor.
 */
export async function GET() {
  if (!isDbConfigured()) return Response.json({ source: 'local' }, { headers: { 'Cache-Control': 'no-store' } });
  try {
    const products = await getPublicCatalog();
    return Response.json(
      { source: 'db', products },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60' } },
    );
  } catch (err) {
    console.error('[catalogo] falha ao ler o banco', err);
    return Response.json({ source: 'error' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

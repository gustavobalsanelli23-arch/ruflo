import { getPool, isDbConfigured } from '@/server/db/client';
import { ensureDatabase } from '@/server/db/migrate';

export const dynamic = 'force-dynamic';

/** Fotos dos produtos novos do fornecedor, guardadas no banco (URL versionada: cache longo). */
export async function GET(_req: Request, ctx: { params: Promise<{ productId: string; n: string }> }) {
  const { productId, n } = await ctx.params;
  const index = Number(n);
  if (!isDbConfigured() || !/^[\w-]{3,80}$/.test(productId) || !Number.isInteger(index) || index < 1 || index > 12) {
    return new Response('Não encontrado', { status: 404 });
  }
  await ensureDatabase();
  const r = await getPool().query<{ bytes: Buffer; etag: string }>('SELECT bytes, etag FROM product_images WHERE product_id = $1 AND n = $2', [productId, index]);
  const row = r.rows[0];
  if (!row) return new Response('Não encontrado', { status: 404 });
  return new Response(new Uint8Array(row.bytes), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: `"${row.etag}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

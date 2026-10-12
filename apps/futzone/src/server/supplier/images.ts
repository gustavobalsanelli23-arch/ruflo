import 'server-only';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

/**
 * Fotos de produtos NOVOS do fornecedor: baixadas uma vez, reduzidas ao padrão do
 * catálogo atual (720x960, 3:4) e guardadas no banco. A loja serve pela rota
 * /api/fotos, então a URL do fornecedor nunca chega ao cliente. As fotos que já
 * existem em /public/produtos não são tocadas.
 */

// O fornecedor guarda as fotos na Base44 (base44.app redireciona para media.base44.com).
const ALLOWED_HOST = /(^|\.)base44\.(app|com)$/i;
const MAX_BYTES = 15 * 1024 * 1024;

export interface StoredPhoto {
  bytes: Buffer;
  etag: string;
}

export function isAllowedPhotoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ALLOWED_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

export async function downloadPhoto(url: string): Promise<StoredPhoto> {
  // Redirecionamentos seguidos à mão: cada destino precisa ser um endereço permitido.
  let current = url;
  let res: Response | null = null;
  for (let hop = 0; hop < 4; hop++) {
    if (!isAllowedPhotoUrl(current)) throw new Error('Origem de foto não permitida.');
    res = await fetch(current, { signal: AbortSignal.timeout(20_000), redirect: 'manual', cache: 'no-store' });
    const next = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!next) break;
    current = new URL(next, current).toString();
    res = null;
  }
  if (!res) throw new Error('Foto com redirecionamentos demais.');
  if (!res.ok) throw new Error(`Foto respondeu ${res.status}.`);
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) throw new Error('Foto grande demais.');
  const input = Buffer.from(await res.arrayBuffer());
  if (input.byteLength > MAX_BYTES) throw new Error('Foto grande demais.');
  const bytes = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(720, 960, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  return { bytes, etag: createHash('sha256').update(bytes).digest('hex').slice(0, 32) };
}

/** Baixa várias fotos; as que falharem são puladas e relatadas. */
export async function downloadPhotos(urls: string[]): Promise<{ photos: StoredPhoto[]; errors: string[] }> {
  const photos: StoredPhoto[] = [];
  const errors: string[] = [];
  for (const url of urls) {
    try {
      photos.push(await downloadPhoto(url));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Falha ao baixar foto.');
    }
  }
  return { photos, errors };
}

export function photoPath(productId: string, n: number, etag: string): string {
  return `/api/fotos/${encodeURIComponent(productId)}/${n}?v=${etag.slice(0, 10)}`;
}

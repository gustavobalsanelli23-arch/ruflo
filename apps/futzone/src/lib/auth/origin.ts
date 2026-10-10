/**
 * Proteção CSRF: requisições que alteram dados só são aceitas quando o
 * cabeçalho Origin é o próprio site. Funciona no proxy e nas rotas.
 */
export function isSameOriginRequest(h: Pick<Headers, 'get'>): boolean {
  const origin = h.get('origin');
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

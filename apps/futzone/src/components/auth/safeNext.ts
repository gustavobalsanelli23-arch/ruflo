/** Só permite voltar para páginas internas da loja (evita redirecionamento aberto). */
export function safeNext(value: string | string[] | undefined, fallback = '/conta'): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/admin') || v.startsWith('/login') || v.startsWith('/cadastro')) return fallback;
  return v;
}

/**
 * Acesso seguro ao localStorage. Em navegação privada, SSR ou com o
 * armazenamento bloqueado, as leituras retornam o valor padrão e as escritas
 * são ignoradas — a interface continua funcionando com os dados em memória.
 */

const PREFIX = 'futzone:';

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível ou cheio — mantém apenas em memória */
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Chaves versionadas: ao mudar o formato dos dados, incremente a versão. */
export const STORAGE_KEYS = {
  cart: 'cart:v2',
  products: 'products:v3',
  orders: 'orders:v2',
  customer: 'customer:v1',
  settings: 'settings:v1',
  recentSearches: 'recent-searches:v1',
} as const;

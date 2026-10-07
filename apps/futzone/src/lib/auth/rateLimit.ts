/**
 * Limite de tentativas de login (por IP e por e-mail).
 *
 * Em memória: protege cada instância do servidor contra força bruta, mas não
 * é compartilhado entre instâncias. Ao conectar um banco/Redis, troque a
 * implementação mantendo a mesma interface.
 */
export interface LoginRateLimiter {
  check(key: string, now?: number): { allowed: boolean; retryAfterSec: number };
  fail(key: string, now?: number): void;
  reset(key: string): void;
}

export const MAX_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60_000;

export function createMemoryRateLimiter(max = MAX_ATTEMPTS, windowMs = WINDOW_MS): LoginRateLimiter {
  const hits = new Map<string, { count: number; first: number }>();
  return {
    check(key, now = Date.now()) {
      const h = hits.get(key);
      if (!h || now - h.first > windowMs) return { allowed: true, retryAfterSec: 0 };
      if (h.count < max) return { allowed: true, retryAfterSec: 0 };
      return { allowed: false, retryAfterSec: Math.ceil((h.first + windowMs - now) / 1000) };
    },
    fail(key, now = Date.now()) {
      const h = hits.get(key);
      if (!h || now - h.first > windowMs) hits.set(key, { count: 1, first: now });
      else h.count++;
      if (hits.size > 5000) hits.delete(hits.keys().next().value!);
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

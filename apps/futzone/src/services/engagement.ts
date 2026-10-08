import { readJSON, STORAGE_KEYS, writeJSON } from '@/services/storage';

/**
 * Favoritos e produtos vistos recentemente.
 * Guardados no navegador enquanto não há banco de dados; as interfaces
 * permitem trocar por persistência na conta do cliente depois.
 */

export interface FavoritesRepository {
  get(owner: string): string[];
  save(owner: string, ids: string[]): void;
}

type FavMap = Record<string, string[]>;

export const favoritesRepository: FavoritesRepository = {
  get: (owner) => readJSON<FavMap>(STORAGE_KEYS.favorites, {})[owner] ?? [],
  save: (owner, ids) => {
    const map = readJSON<FavMap>(STORAGE_KEYS.favorites, {});
    map[owner] = ids;
    writeJSON(STORAGE_KEYS.favorites, map);
  },
};

export const GUEST_OWNER = 'visitante';

const MAX_RECENT = 12;

export const recentlyViewed = {
  list(): string[] {
    return readJSON<string[]>(STORAGE_KEYS.recentlyViewed, []);
  },
  record(productId: string): string[] {
    const next = [productId, ...this.list().filter((id) => id !== productId)].slice(0, MAX_RECENT);
    writeJSON(STORAGE_KEYS.recentlyViewed, next);
    return next;
  },
};

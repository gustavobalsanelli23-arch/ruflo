import type { Cents, CategoryId } from '@/types/catalog';

/**
 * Tabela de preços por tipo de camisa. O fornecedor não informa preço: a FutZone
 * define o valor de cada tipo (editável no painel, em Integração com fornecedor).
 * Preço editado à mão num produto nunca é sobrescrito por esta tabela.
 */

export type PriceKey = 'infantil' | 'kits' | 'retro' | 'jogador' | 'femininas' | 'selecoes' | 'nacional' | 'importada';

export type PriceRules = Record<PriceKey, Cents>;

export const DEFAULT_PRICE_RULES: PriceRules = {
  infantil: 24990,
  kits: 27990,
  retro: 25990,
  jogador: 42990,
  femininas: 32990,
  selecoes: 34990,
  nacional: 34990,
  importada: 39990,
};

export const PRICE_KEY_LABEL: Record<PriceKey, string> = {
  infantil: 'Infantil',
  kits: 'Kits (camisa e short)',
  retro: 'Retrô',
  jogador: 'Versão jogador',
  femininas: 'Feminina',
  selecoes: 'Seleções',
  nacional: 'Clubes brasileiros',
  importada: 'Clubes internacionais',
};

export interface PriceSubject {
  name: string;
  category: CategoryId;
  kids: boolean;
  /** País do time (ex.: "Brasil"). */
  teamCountry: string;
}

/** Tipo de preço de uma camisa (mesma ordem de prioridade do catálogo original). */
export function priceKeyFor(s: PriceSubject): PriceKey {
  if (s.kids) return 'infantil';
  if (s.category === 'kits') return 'kits';
  if (s.category === 'retro') return 'retro';
  if (s.name.toLowerCase().includes('jogador')) return 'jogador';
  if (s.category === 'femininas') return 'femininas';
  if (s.category === 'selecoes') return 'selecoes';
  return s.teamCountry === 'Brasil' ? 'nacional' : 'importada';
}

export function rulePrice(s: PriceSubject, rules: PriceRules = DEFAULT_PRICE_RULES): Cents {
  return rules[priceKeyFor(s)];
}

/** Aceita só valores inteiros positivos em centavos; o resto volta ao padrão. */
export function sanitizePriceRules(input: unknown): PriceRules {
  const out = { ...DEFAULT_PRICE_RULES };
  if (input && typeof input === 'object') {
    for (const key of Object.keys(DEFAULT_PRICE_RULES) as PriceKey[]) {
      const v = (input as Record<string, unknown>)[key];
      if (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 10_000_000) out[key] = v;
    }
  }
  return out;
}

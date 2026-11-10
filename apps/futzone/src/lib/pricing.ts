import type { Cents, CategoryId } from '@/types/catalog';

/**
 * Tabela de preços por tipo de camisa (frete à parte, cobrado no pagamento pela Stripe).
 * O fornecedor não informa preço: a FutZone define o valor de cada tipo
 * (editável no painel, em Integração com fornecedor). Preço editado à mão num
 * produto nunca é sobrescrito por esta tabela.
 */

export type PriceKey = 'torcedor' | 'infantil' | 'conjunto' | 'jogador' | 'especial' | 'retro';

export type PriceRules = Record<PriceKey, Cents>;

/** Black Friday: R$ 150,00 em todos os tipos (igual aos links da Stripe). */
export const DEFAULT_PRICE_RULES: PriceRules = {
  torcedor: 15000,
  infantil: 15000,
  conjunto: 15000,
  jogador: 15000,
  especial: 15000,
  retro: 15000,
};

export const PRICE_KEY_LABEL: Record<PriceKey, string> = {
  torcedor: 'Torcedor (clubes, seleções, femininas)',
  infantil: 'Infantil',
  conjunto: 'Conjunto (camisa e short)',
  jogador: 'Versão jogador',
  especial: 'Edição especial',
  retro: 'Retrô',
};

export interface PriceSubject {
  name: string;
  category: CategoryId;
  kids: boolean;
  /** País do time (não muda o preço na tabela atual). */
  teamCountry?: string;
}

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Tipo de preço de uma camisa, nesta ordem de prioridade. */
export function priceKeyFor(s: PriceSubject): PriceKey {
  const name = plain(s.name);
  if (s.kids) return 'infantil';
  if (s.category === 'kits') return 'conjunto';
  if (s.category === 'retro') return 'retro';
  if (/\bjogador\b/.test(name)) return 'jogador';
  if (/\bespecial\b|\banniversary\b/.test(name)) return 'especial';
  return 'torcedor';
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

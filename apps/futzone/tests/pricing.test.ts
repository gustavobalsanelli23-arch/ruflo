import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICE_RULES, priceKeyFor, rulePrice, sanitizePriceRules } from '@/lib/pricing';
import { seedProducts } from '@/data/products';

describe('tabela de preços', () => {
  it('classifica cada tipo de camisa', () => {
    const cases: Array<[Parameters<typeof priceKeyFor>[0], string]> = [
      [{ name: 'Camisa Flamengo Rubro-Negra I 26/27', category: 'clubes', kids: false }, 'torcedor'],
      [{ name: 'Camisa Brasil Amarela I 2026', category: 'selecoes', kids: false }, 'torcedor'],
      [{ name: 'Camisa Feminina Palmeiras Verde I 26/27', category: 'femininas', kids: false }, 'torcedor'],
      [{ name: 'Kit Infantil Flamengo I 26/27', category: 'kits', kids: true }, 'infantil'],
      [{ name: 'Kit Camisa e Short Manchester City Branco', category: 'kits', kids: false }, 'conjunto'],
      [{ name: 'Camisa Jogador Vasco Amarela III 2026/27', category: 'clubes', kids: false }, 'jogador'],
      [{ name: 'Camisa Santos Charlie Brown JR Especial', category: 'clubes', kids: false }, 'especial'],
      [{ name: 'Camisa Argentina Anniversary', category: 'selecoes', kids: false }, 'especial'],
      [{ name: 'Camisa Retrô Flamengo 1995', category: 'retro', kids: false }, 'retro'],
    ];
    for (const [subject, key] of cases) expect(priceKeyFor(subject), subject.name).toBe(key);
  });

  it('valores definidos pela loja (frete à parte)', () => {
    expect(DEFAULT_PRICE_RULES).toEqual({ torcedor: 16990, infantil: 16990, conjunto: 16990, jogador: 18990, especial: 18990, retro: 20990 });
    expect(rulePrice({ name: 'Camisa Jogador Arsenal - Edição Especial 25/26', category: 'clubes', kids: false })).toBe(18990);
  });

  it('o catálogo inicial só tem os preços novos', () => {
    expect(new Set(seedProducts.map((p) => p.price))).toEqual(new Set([16990, 18990, 20990]));
  });

  it('tabela gravada no formato antigo volta aos valores novos', () => {
    expect(sanitizePriceRules({ nacional: 34990, importada: 39990, retro: 21990 })).toEqual({ ...DEFAULT_PRICE_RULES, retro: 21990 });
  });
});

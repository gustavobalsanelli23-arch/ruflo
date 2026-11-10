import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICE_RULES, priceKeyFor, REGULAR_PRICE_RULES, regularPrice, rulePrice, sanitizePriceRules } from '@/lib/pricing';
import { seedProducts } from '@/data/products';
import { withRegularPrice } from '@/server/catalog/store';

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
    expect(DEFAULT_PRICE_RULES).toEqual({ torcedor: 15000, infantil: 15000, conjunto: 15000, jogador: 15000, especial: 15000, retro: 15000 });
    expect(rulePrice({ name: 'Camisa Jogador Arsenal - Edição Especial 25/26', category: 'clubes', kids: false })).toBe(15000);
  });

  it('o catálogo inicial só tem os preços novos', () => {
    expect(new Set(seedProducts.map((p) => p.price))).toEqual(new Set([15000]));
  });

  it('Black Friday: o preço antigo do tipo aparece riscado', () => {
    for (const p of seedProducts) {
      const key = priceKeyFor({ name: p.name, category: p.category, kids: p.gender === 'infantil' });
      expect(p.compareAtPrice, p.name).toBe(REGULAR_PRICE_RULES[key]);
    }
    expect(regularPrice({ name: 'Camisa Retrô Flamengo 1995', category: 'retro', kids: false })).toBe(20990);
    // Sem desconto, não há preço riscado.
    expect(regularPrice({ name: 'Camisa Retrô Flamengo 1995', category: 'retro', kids: false }, { ...DEFAULT_PRICE_RULES, retro: 20990 })).toBeUndefined();
  });

  it('catálogo do banco: produto a R$ 150,00 sem preço anterior ganha o riscado do tipo', () => {
    const p = seedProducts.find((x) => x.category === 'retro')!;
    const { compareAtPrice: _, ...bare } = p;
    expect(withRegularPrice(bare).compareAtPrice).toBe(20990);
    // Preço anterior já definido (à mão) é mantido.
    expect(withRegularPrice({ ...bare, compareAtPrice: 25000 }).compareAtPrice).toBe(25000);
    // Preço fora da tabela (editado à mão) não ganha riscado.
    expect(withRegularPrice({ ...bare, price: 18000 }).compareAtPrice).toBeUndefined();
  });

  it('tabela gravada no formato antigo volta aos valores novos', () => {
    expect(sanitizePriceRules({ nacional: 34990, importada: 39990, retro: 21990 })).toEqual({ ...DEFAULT_PRICE_RULES, retro: 21990 });
  });
});

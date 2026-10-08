import type { Product } from '@/types/catalog';
import { availableSizes } from './product';

/**
 * Recomendações "Você também pode gostar" a partir de produtos de referência
 * (o produto aberto ou os itens do carrinho): mesmo time, mesma categoria,
 * retrô e kits — só produtos publicados e com estoque.
 */
export function recommend(products: Product[], references: Product[], { limit = 8, exclude = [] as string[] } = {}): Product[] {
  const excluded = new Set([...exclude, ...references.map((r) => r.id)]);
  const teams = new Set(references.map((r) => r.teamId));
  const categories = new Set(references.map((r) => r.category));

  return products
    .filter((p) => p.status === 'published' && !excluded.has(p.id) && availableSizes(p).length > 0)
    .map((p) => {
      let score = 0;
      if (teams.has(p.teamId)) score += 6;
      if (categories.has(p.category)) score += 3;
      if (p.category === 'retro' || p.category === 'kits') score += 1;
      if (p.tags.includes('mais-vendido') || p.tags.includes('popular')) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || b.p.salesCount - a.p.salesCount)
    .slice(0, limit)
    .map(({ p }) => p);
}

import type { CategoryId, Product } from '@/types/catalog';

/** Recorte fixo de uma vitrine (ex.: /retro só mostra retrô, /camisas/flamengo só o Flamengo). */
export interface CatalogPreset {
  category?: CategoryId;
  teamId?: string;
  onSale?: boolean;
}

/** Produtos que pertencem à vitrine, antes da busca e dos filtros do visitante. */
export function scopeProducts(products: Product[], preset: CatalogPreset = {}): Product[] {
  return products.filter(
    (p) =>
      (!preset.category || p.category === preset.category) &&
      (!preset.teamId || p.teamId === preset.teamId) &&
      (!preset.onSale || (p.compareAtPrice ?? 0) > p.price),
  );
}

export const productNoun = (n: number) => (n === 1 ? 'produto' : 'produtos');

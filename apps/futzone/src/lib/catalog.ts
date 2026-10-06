import type { CategoryId, Product, Size } from '@/types/catalog';
import { isOnSale, stockFor, teamById } from './product';

/**
 * Busca, filtros e ordenação do catálogo — funções puras, sem dependência de
 * React, para que possam ser reutilizadas por uma API real no futuro.
 */

export type SortKey = 'relevancia' | 'novidades' | 'preco-asc' | 'preco-desc';

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'novidades', label: 'Novidades' },
  { value: 'preco-asc', label: 'Menor preço' },
  { value: 'preco-desc', label: 'Maior preço' },
];

export interface PriceRange {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const PRICE_RANGES: PriceRange[] = [
  { id: 'ate-250', label: 'Até R$ 250', max: 25000 },
  { id: '250-350', label: 'R$ 250 a R$ 350', min: 25000, max: 35000 },
  { id: '350-450', label: 'R$ 350 a R$ 450', min: 35000, max: 45000 },
  { id: 'acima-450', label: 'Acima de R$ 450', min: 45000 },
];

export interface CatalogQuery {
  q: string;
  teams: string[];
  categories: CategoryId[];
  sizes: Size[];
  price: string | null;
  onSale: boolean;
  sort: SortKey;
}

export const EMPTY_QUERY: CatalogQuery = {
  q: '',
  teams: [],
  categories: [],
  sizes: [],
  price: null,
  onSale: false,
  sort: 'relevancia',
};

export const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function matchesSearch(product: Product, q: string): boolean {
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const team = teamById(product.teamId);
  const haystack = normalize([product.name, team?.name ?? '', product.season, product.category].join(' '));
  return terms.every((t) => haystack.includes(t));
}

export function filterProducts(products: Product[], query: CatalogQuery): Product[] {
  const range = PRICE_RANGES.find((r) => r.id === query.price);
  return products.filter((p) => {
    if (!matchesSearch(p, query.q)) return false;
    if (query.teams.length && !query.teams.includes(p.teamId)) return false;
    if (query.categories.length && !query.categories.includes(p.category)) return false;
    if (query.sizes.length && !query.sizes.some((s) => stockFor(p, s) > 0)) return false;
    if (query.onSale && !isOnSale(p)) return false;
    if (range) {
      if (range.min !== undefined && p.price < range.min) return false;
      if (range.max !== undefined && p.price > range.max) return false;
    }
    return true;
  });
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case 'preco-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'preco-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'novidades':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'relevancia':
    default:
      return list.sort((a, b) => b.salesCount - a.salesCount);
  }
}

export const queryCatalog = (products: Product[], query: CatalogQuery): Product[] =>
  sortProducts(filterProducts(products, query), query.sort);

/** Serialização da busca para a URL (?q=&time=&categoria=&tamanho=&preco=&promo=&ordem=). */
export function queryFromParams(params: URLSearchParams): CatalogQuery {
  const list = (key: string) => params.get(key)?.split(',').filter(Boolean) ?? [];
  const sort = params.get('ordem') as SortKey | null;
  return {
    q: params.get('q') ?? '',
    teams: list('time'),
    categories: list('categoria') as CategoryId[],
    sizes: list('tamanho') as Size[],
    price: params.get('preco'),
    onSale: params.get('promo') === '1',
    sort: sort && SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'relevancia',
  };
}

export function paramsFromQuery(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.teams.length) params.set('time', query.teams.join(','));
  if (query.categories.length) params.set('categoria', query.categories.join(','));
  if (query.sizes.length) params.set('tamanho', query.sizes.join(','));
  if (query.price) params.set('preco', query.price);
  if (query.onSale) params.set('promo', '1');
  if (query.sort !== 'relevancia') params.set('ordem', query.sort);
  return params;
}

export function activeFilterCount(query: CatalogQuery): number {
  return query.teams.length + query.categories.length + query.sizes.length + (query.price ? 1 : 0) + (query.onSale ? 1 : 0);
}

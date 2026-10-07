import type { Product, Size, Team } from '@/types/catalog';
import { teams } from '@/data/teams';

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export type StockLevel = 'disponivel' | 'baixo' | 'esgotado';

export const teamById = (id: string): Team | undefined => teams.find((t) => t.id === id);
export const teamBySlug = (slug: string): Team | undefined => teams.find((t) => t.slug === slug);

export function productHref(product: Product): string {
  const team = teamById(product.teamId);
  return `/camisas/${team?.slug ?? 'time'}/${product.slug}`;
}

export const isOnSale = (p: Product): boolean =>
  p.compareAtPrice !== undefined && p.compareAtPrice > p.price;

export const discountPercent = (p: Product): number =>
  isOnSale(p) ? Math.round((1 - p.price / (p.compareAtPrice as number)) * 100) : 0;

export const stockFor = (p: Product, size: Size): number => p.stock[size] ?? 0;

export const totalStock = (p: Product): number =>
  p.sizes.reduce((sum, s) => sum + stockFor(p, s), 0);

export const availableSizes = (p: Product): Size[] => p.sizes.filter((s) => stockFor(p, s) > 0);

export function stockLevel(p: Product, threshold = DEFAULT_LOW_STOCK_THRESHOLD): StockLevel {
  const total = totalStock(p);
  if (total === 0) return 'esgotado';
  if (total <= threshold) return 'baixo';
  return 'disponivel';
}

export function sizeStockLevel(qty: number, threshold = DEFAULT_LOW_STOCK_THRESHOLD): StockLevel {
  if (qty <= 0) return 'esgotado';
  // Por tamanho o limite é menor: metade do limite do produto, no mínimo 2.
  if (qty <= Math.max(2, Math.floor(threshold / 2))) return 'baixo';
  return 'disponivel';
}

export const STOCK_LABEL: Record<StockLevel, string> = {
  disponivel: 'Disponível',
  baixo: 'Últimas unidades',
  esgotado: 'Esgotado',
};

/** Busca um produto pela referência (time + slug). */
export const findByRef = (products: Product[], ref: { teamId: string; slug: string }): Product | undefined =>
  products.find((p) => p.teamId === ref.teamId && p.slug === ref.slug);

export type BadgeKind = 'esgotado' | 'promo' | 'novo' | 'mais-vendido' | 'destaque' | 'retro' | 'kit' | 'infantil';

/**
 * Selos do card, em ordem de importância (no máximo `max`).
 * Só aparecem quando o dado do produto justifica — nunca aleatórios.
 */
export function badgesFor(p: Product, max = 2): BadgeKind[] {
  if (totalStock(p) === 0) return ['esgotado'];
  const list: BadgeKind[] = [];
  if (isOnSale(p)) list.push('promo');
  if (p.tags.includes('lancamento')) list.push('novo');
  if (p.tags.includes('mais-vendido')) list.push('mais-vendido');
  else if (p.tags.includes('popular')) list.push('destaque');
  if (p.category === 'retro') list.push('retro');
  if (p.category === 'kits') list.push(p.gender === 'infantil' ? 'infantil' : 'kit');
  return list.slice(0, max);
}

export const isPublic = (p: Product): boolean => p.status === 'published';

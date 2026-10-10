import type { CategoryId, Product, ProductTag, Size } from '@/types/catalog';
import { ADULT_SIZES, ALL_SIZES, KIDS_SIZES } from '@/types/catalog';
import catalog from './catalogo-futzone.json';
import { categories } from './categories';
import { teams } from './teams';

/**
 * Catálogo FutZone — gerado a partir do catálogo do fornecedor (catalogopro).
 *
 * `catalogo-futzone.json` traz nome, time, categoria, tamanhos disponíveis e a
 * quantidade de fotos de cada camisa (em /public/produtos/<time>/<slug>/N.jpg).
 * Para adicionar produtos, inclua uma linha no JSON — nenhum componente muda.
 *
 * PROVISÓRIO: o catálogo do fornecedor não informa preço nem quantidade em
 * estoque. Os preços abaixo seguem uma tabela por tipo de camisa e cada tamanho
 * disponível recebe uma quantidade simulada. Ajustar quando houver os valores reais.
 */

interface CatalogEntry {
  sourceId: string;
  name: string;
  slug: string;
  teamId: string;
  category: CategoryId;
  kids: boolean;
  season: string;
  availableSizes: string[];
  photos: number;
  tags: string[];
  order: number;
  createdAt: string;
}

const PROVISIONAL_STOCK_PER_SIZE = 5;
const FEATURED_COUNT = 8;

function provisionalPrice(e: CatalogEntry, teamCountry: string): number {
  const name = e.name.toLowerCase();
  if (e.kids) return 24990;
  if (e.category === 'kits') return 27990;
  if (e.category === 'retro') return 25990;
  if (name.includes('jogador')) return 42990;
  if (e.category === 'femininas') return 32990;
  if (e.category === 'selecoes') return 34990;
  return teamCountry === 'Brasil' ? 34990 : 39990;
}

const entries = catalog as CatalogEntry[];
// Destaques da Home: seguem a ordem do catálogo do fornecedor, só com itens em estoque.
const inStock = entries.filter((e) => e.availableSizes.length > 0);
const featuredRank = new Map(inStock.map((e, i) => [e.sourceId, i]));
const newest = new Set(
  [...inStock].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, FEATURED_COUNT).map((e) => e.sourceId),
);

function toProduct(e: CatalogEntry): Product {
  const team = teams.find((t) => t.id === e.teamId);
  if (!team) throw new Error(`Time desconhecido em produto ${e.name}: ${e.teamId}`);
  const available = new Set(e.availableSizes);
  const base: Size[] = e.kids ? KIDS_SIZES : ADULT_SIZES.slice(0, 5);
  const sizes = ALL_SIZES.filter((s) => base.includes(s) || available.has(s));
  const tags = new Set(e.tags as ProductTag[]);
  const rank = featuredRank.get(e.sourceId) ?? Infinity;
  if (rank < FEATURED_COUNT) tags.add('mais-vendido');
  else if (rank < FEATURED_COUNT * 2) tags.add('popular');
  if (newest.has(e.sourceId)) tags.add('lancamento');
  const categoryName = categories.find((c) => c.id === e.category)?.name ?? e.category;

  return {
    id: `fz-${e.sourceId}`,
    slug: e.slug,
    name: e.name,
    teamId: e.teamId,
    category: e.category,
    season: e.season,
    gender: e.kids ? 'infantil' : e.category === 'femininas' ? 'feminino' : 'masculino',
    description: `${e.name}. Produto do catálogo FutZone.`,
    details: [`Time: ${team.name}`, ...(e.season ? [`Temporada: ${e.season}`] : []), `Categoria: ${categoryName}`],
    price: provisionalPrice(e, team.country),
    sizes,
    stock: Object.fromEntries(sizes.map((s) => [s, available.has(s) ? PROVISIONAL_STOCK_PER_SIZE : 0])),
    images: Array.from({ length: e.photos }, (_, i) => ({
      src: `/produtos/${e.teamId}/${e.slug}/${i + 1}.jpg`,
      alt: i === 0 ? e.name : `${e.name}, foto ${i + 1}`,
    })),
    palette: team.colors,
    status: 'published',
    tags: [...tags],
    salesCount: entries.length - e.order,
    createdAt: e.createdAt,
  };
}

export const seedProducts: Product[] = entries.map(toProduct);

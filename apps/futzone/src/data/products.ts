import type { CategoryId, Product, ProductTag, Size } from '@/types/catalog';
import { ADULT_SIZES, ALL_SIZES, KIDS_SIZES } from '@/types/catalog';
import catalog from './catalogo-futzone.json';
import { categories } from './categories';
import { teams } from './teams';
import { rulePrice } from '@/lib/pricing';

/**
 * Catálogo FutZone — gerado a partir do catálogo do fornecedor (catalogopro).
 *
 * `catalogo-futzone.json` traz nome, time, categoria, tamanhos disponíveis e a
 * quantidade de fotos de cada camisa (em /public/produtos/<time>/<slug>/N.jpg).
 * Para adicionar produtos, inclua uma linha no JSON — nenhum componente muda.
 *
 * O fornecedor não informa preço nem quantidade em estoque. Os preços seguem a
 * tabela por tipo de camisa (`lib/pricing`) e cada tamanho disponível recebe o
 * limite de venda padrão. Com o banco configurado, este arquivo é só o ponto de
 * partida: a sincronização com o fornecedor (server/supplier) mantém o catálogo
 * atualizado no banco, e o admin ajusta preços e limites.
 */

export interface CatalogEntry {
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

// Limite de venda padrão por tamanho disponível no fornecedor (editável no painel).
// Fica acima do limite de "últimas unidades" (lib/product): um limite padrão nunca
// vira aviso de urgência. Avisos de estoque baixo só aparecem quando o admin
// registra a quantidade real.
export const DEFAULT_SIZE_CAP = 12;
const FEATURED_COUNT = 8;

const entries = catalog as CatalogEntry[];
// Destaques da Home: seguem a ordem do catálogo do fornecedor, só com itens em estoque.
const inStock = entries.filter((e) => e.availableSizes.length > 0);
const featuredRank = new Map(inStock.map((e, i) => [e.sourceId, i]));
const newest = new Set(
  [...inStock].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, FEATURED_COUNT).map((e) => e.sourceId),
);

/** Grade exibida: a grade base (adulto P–2GG ou infantil) mais o que o fornecedor tiver disponível. */
export function gridFor(kids: boolean, availableSizes: readonly string[]): Size[] {
  const available = new Set(availableSizes);
  const base: Size[] = kids ? KIDS_SIZES : ADULT_SIZES.slice(0, 5);
  return ALL_SIZES.filter((s) => base.includes(s) || available.has(s));
}

/**
 * Monta o produto da loja a partir de uma linha do catálogo do fornecedor. Usado
 * no catálogo inicial e pela sincronização (produtos novos), para os dois terem a
 * mesma forma.
 */
export function buildProduct(
  e: CatalogEntry,
  opts: { tags: ProductTag[]; salesCount: number; images?: Product['images']; price?: number; cap?: number },
): Product {
  const team = teams.find((t) => t.id === e.teamId);
  if (!team) throw new Error(`Time desconhecido em produto ${e.name}: ${e.teamId}`);
  const available = new Set(e.availableSizes);
  const sizes = gridFor(e.kids, e.availableSizes);
  const categoryName = categories.find((c) => c.id === e.category)?.name ?? e.category;
  const cap = opts.cap ?? DEFAULT_SIZE_CAP;
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
    price: opts.price ?? rulePrice({ name: e.name, category: e.category, kids: e.kids, teamCountry: team.country }),
    sizes,
    stock: Object.fromEntries(sizes.map((s) => [s, available.has(s) ? cap : 0])),
    images:
      opts.images ??
      Array.from({ length: e.photos }, (_, i) => ({
        src: `/produtos/${e.teamId}/${e.slug}/${i + 1}.jpg`,
        alt: i === 0 ? e.name : `${e.name}, foto ${i + 1}`,
      })),
    palette: team.colors,
    status: 'published',
    tags: opts.tags,
    salesCount: opts.salesCount,
    createdAt: e.createdAt,
  };
}

function toProduct(e: CatalogEntry): Product {
  // "mais-vendido" do arquivo do fornecedor é alegação dele, não venda da FutZone: não entra.
  const tags = new Set((e.tags as ProductTag[]).filter((t) => t !== 'mais-vendido'));
  const rank = featuredRank.get(e.sourceId) ?? Infinity;
  // Destaque segue a ordem do catálogo do fornecedor. "Mais vendido" só existe quando a loja
  // tiver dado real de vendas (o admin pode marcar à mão): nunca é inventado aqui.
  if (rank < FEATURED_COUNT * 2) tags.add('popular');
  if (newest.has(e.sourceId)) tags.add('lancamento');
  return buildProduct(e, { tags: [...tags], salesCount: entries.length - e.order });
}

export const seedProducts: Product[] = entries.map(toProduct);

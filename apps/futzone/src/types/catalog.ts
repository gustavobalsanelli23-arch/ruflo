/**
 * Tipos centrais do catálogo FutZone.
 * Produtos são sempre dados — nunca marcação escrita dentro dos componentes.
 */

/** Grade de tamanhos do fornecedor (adulto P–4GG; infantil T18–T28). */
export type AdultSize = 'P' | 'M' | 'G' | 'GG' | '2GG' | '3GG' | '4GG';
export type KidsSize = 'T18' | 'T20' | 'T22' | 'T24' | 'T26' | 'T28';
export type Size = AdultSize | KidsSize;

export const ADULT_SIZES: AdultSize[] = ['P', 'M', 'G', 'GG', '2GG', '3GG', '4GG'];
export const KIDS_SIZES: KidsSize[] = ['T18', 'T20', 'T22', 'T24', 'T26', 'T28'];
export const ALL_SIZES: Size[] = [...ADULT_SIZES, ...KIDS_SIZES];

export type CategoryId = 'clubes' | 'retro' | 'kits' | 'selecoes' | 'femininas';

export interface Category {
  id: CategoryId;
  name: string;
  /** Rótulo curto usado em badges e filtros. */
  shortName: string;
  description: string;
  /** Rota pública da categoria. */
  href: string;
}

export type TeamKind = 'clube' | 'selecao';

export interface Team {
  id: string;
  slug: string;
  name: string;
  country: string;
  kind: TeamKind;
  /** Cores institucionais usadas apenas em placeholders ilustrativos. */
  colors: { primary: string; secondary: string };
}

export type ProductStatus = 'published' | 'draft' | 'inactive';
export type ProductGender = 'masculino' | 'feminino' | 'infantil' | 'unissex';
export type ProductTag = 'mais-vendido' | 'lancamento' | 'popular';

export interface ProductImage {
  src: string;
  alt: string;
}

/** Valores monetários em centavos (BRL) para evitar erros de ponto flutuante. */
export type Cents = number;

export interface Product {
  id: string;
  slug: string;
  name: string;
  teamId: string;
  category: CategoryId;
  season: string;
  gender: ProductGender;
  description: string;
  details: string[];
  price: Cents;
  /** Preço anterior. Quando maior que `price`, o produto está em promoção. */
  compareAtPrice?: Cents;
  sizes: Size[];
  stock: Partial<Record<Size, number>>;
  /** Imagens reais do produto. Vazio = placeholder ilustrativo. */
  images: ProductImage[];
  /** Cores usadas pelo placeholder quando não há imagem real. */
  palette: { primary: string; secondary: string };
  status: ProductStatus;
  tags: ProductTag[];
  /** Vendas simuladas — usadas na ordenação por relevância. */
  salesCount: number;
  createdAt: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'salesCount'> & {
  id?: string;
};

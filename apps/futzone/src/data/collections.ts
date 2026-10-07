import type { Product, Team } from '@/types/catalog';
import type { ProductRef } from './site';

/**
 * Coleções da vitrine (Home e filtros do catálogo). São agrupamentos sobre os
 * dados existentes — um produto pode estar em mais de uma coleção.
 */
export type CollectionId = 'brasileirao' | 'europeus' | 'selecoes' | 'retro' | 'kits' | 'femininas' | 'infantis';

export interface Collection {
  id: CollectionId;
  name: string;
  description: string;
  /** Foto de capa (produto do catálogo). */
  cover: ProductRef;
  /** Palavras extras que a busca reconhece para esta coleção. */
  keywords: string[];
  matches(product: Product, team: Team | undefined): boolean;
}

const EUROPEAN_COUNTRIES = new Set(['Espanha', 'Inglaterra', 'Itália', 'França', 'Alemanha', 'Portugal', 'Holanda']);
/** Clubes europeus agrupados como "Outros" no catálogo do fornecedor. */
const EUROPEAN_CLUBS = new Set(['benfica', 'aik']);

const isClubShirt = (p: Product) => p.category === 'clubes';

export const collections: Collection[] = [
  {
    id: 'brasileirao',
    name: 'Brasileirão',
    description: 'Os mantos dos clubes brasileiros na temporada.',
    cover: { teamId: 'fluminense', slug: 'camisa-fluminense-tricolor-i-26-27' },
    keywords: ['brasileirao', 'nacional'],
    matches: (p, t) => isClubShirt(p) && t?.country === 'Brasil',
  },
  {
    id: 'europeus',
    name: 'Europeus',
    description: 'Gigantes da Europa: Real, Barça, PSG e mais.',
    cover: { teamId: 'barcelona', slug: 'camisa-jogador-barcelona-listrada-i-25-26' },
    keywords: ['europeu', 'europa', 'champions'],
    matches: (p, t) => isClubShirt(p) && !!t && (EUROPEAN_COUNTRIES.has(t.country) || EUROPEAN_CLUBS.has(t.id)),
  },
  {
    id: 'selecoes',
    name: 'Seleções',
    description: 'Vista as cores do seu país.',
    cover: { teamId: 'holanda', slug: 'camisa-holanda-laranja-i-26-27' },
    keywords: ['selecao', 'selecoes', 'copa'],
    matches: (p) => p.category === 'selecoes',
  },
  {
    id: 'retro',
    name: 'Retrô',
    description: 'Clássicos que marcaram gerações.',
    cover: { teamId: 'flamengo', slug: 'camisa-retro-flamengo-1992-93' },
    keywords: ['retro', 'classica', 'antiga'],
    matches: (p) => p.category === 'retro',
  },
  {
    id: 'kits',
    name: 'Kits',
    description: 'Regata ou camisa com short, prontos para o treino.',
    cover: { teamId: 'flamengo', slug: 'kit-regata-e-short-flamengo-treino-amarelo' },
    keywords: ['kit', 'regata', 'short', 'conjunto', 'treino'],
    matches: (p) => p.category === 'kits' && p.gender !== 'infantil',
  },
  {
    id: 'femininas',
    name: 'Femininas',
    description: 'Modelagem pensada para a torcedora.',
    cover: { teamId: 'flamengo', slug: 'camisa-feminina-flamengo-listrada-i-26-27' },
    keywords: ['feminina', 'feminino', 'mulher', 'baby look'],
    matches: (p) => p.gender === 'feminino',
  },
  {
    id: 'infantis',
    name: 'Infantis',
    description: 'Kits completos para os pequenos torcedores.',
    cover: { teamId: 'flamengo', slug: 'kit-infantil-flamengo-listrado-i-26-27' },
    keywords: ['infantil', 'crianca', 'kids', 'menino', 'menina'],
    matches: (p) => p.gender === 'infantil',
  },
];

export const collectionById = (id: string): Collection | undefined => collections.find((c) => c.id === id);
export const collectionHref = (id: CollectionId) => `/camisas?colecao=${id}`;

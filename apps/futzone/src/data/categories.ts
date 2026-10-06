import type { Category, CategoryId } from '@/types/catalog';

export const categories: Category[] = [
  {
    id: 'clubes',
    name: 'Camisas de clubes',
    shortName: 'Clubes',
    description: 'Os mantos da temporada dos maiores clubes do Brasil e do mundo.',
    href: '/camisas?categoria=clubes',
  },
  {
    id: 'retro',
    name: 'Camisas retrô',
    shortName: 'Retrô',
    description: 'Clássicos que marcaram época, com acabamento inspirado no original.',
    href: '/retro',
  },
  {
    id: 'kits',
    name: 'Kits',
    shortName: 'Kits',
    description: 'Camisa e calção juntos — do campo à arquibancada.',
    href: '/kits',
  },
  {
    id: 'selecoes',
    name: 'Camisas de seleções',
    shortName: 'Seleções',
    description: 'Vista as cores do seu país em qualquer competição.',
    href: '/camisas?categoria=selecoes',
  },
  {
    id: 'femininas',
    name: 'Camisas femininas',
    shortName: 'Femininas',
    description: 'Modelagem baby look pensada para torcedoras.',
    href: '/camisas?categoria=femininas',
  },
];

export const categoryById = (id: CategoryId): Category | undefined =>
  categories.find((c) => c.id === id);

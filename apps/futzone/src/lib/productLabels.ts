import type { ProductStatus, ProductTag } from '@/types/catalog';
import type { BadgeTone } from '@/components/ui/Badge';

export const STATUS_META: Record<ProductStatus, { label: string; tone: BadgeTone }> = {
  published: { label: 'Publicado', tone: 'success' },
  draft: { label: 'Rascunho', tone: 'neutral' },
  inactive: { label: 'Desativado', tone: 'danger' },
};

export const TAG_LABEL: Record<ProductTag, string> = {
  'mais-vendido': 'Mais vendido',
  lancamento: 'Lançamento',
  popular: 'Popular',
};

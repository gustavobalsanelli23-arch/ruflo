/** Conteúdo institucional e de navegação da loja. */

export const site = {
  name: 'FUTZONE',
  tagline: 'Vista a paixão pelo futebol.',
  description: 'Camisas de clubes, seleções, retrô e kits — para quem vive o futebol dentro e fora do estádio.',
  contactEmail: 'contato@futzone.com.br',
  /** Perfis oficiais. Deixe `href` vazio até o perfil existir — links vazios não aparecem. */
  social: [
    { name: 'Instagram', href: '' },
    { name: 'TikTok', href: '' },
    { name: 'WhatsApp', href: '' },
  ] as Array<{ name: string; href: string }>,
  freeShippingFrom: 29900,
};

/** Referência a um produto do catálogo pelo time e slug (ex.: URL /camisas/brasil/...). */
export interface ProductRef {
  teamId: string;
  slug: string;
}

/** Vitrine do hero (3 camisas): esquerda, centro (destaque) e direita. */
export const heroShowcase: ProductRef[] = [
  { teamId: 'flamengo', slug: 'camisa-jogador-flamengo-listrada-i-26-27' },
  { teamId: 'brasil', slug: 'camisa-torcedor-selecao-brasil-amarela-i-26-27' },
  { teamId: 'barcelona', slug: 'camisa-jogador-barcelona-listrada-i-25-26' },
];

/** Foto de capa dos cards de categoria na Home. */
export const categoryCovers: Record<string, ProductRef> = {
  clubes: { teamId: 'fluminense', slug: 'camisa-fluminense-tricolor-i-26-27' },
  retro: { teamId: 'flamengo', slug: 'camisa-retro-flamengo-1992-93' },
  kits: { teamId: 'flamengo', slug: 'kit-regata-e-short-flamengo-treino-amarelo' },
  selecoes: { teamId: 'holanda', slug: 'camisa-holanda-laranja-i-26-27' },
  femininas: { teamId: 'flamengo', slug: 'camisa-feminina-flamengo-listrada-i-26-27' },
  times: { teamId: 'palmeiras', slug: 'camisa-palmeiras-verde-i-26-27' },
};

/** Fotos do banner da coleção retrô. */
export const retroShowcase: ProductRef[] = [
  { teamId: 'milan', slug: 'camisa-retro-ac-milan-2006-07-kaka' },
  { teamId: 'psg', slug: 'camisa-retro-psg-i-ronaldinho-2001-02' },
  { teamId: 'flamengo', slug: 'camisa-retro-flamengo-1997' },
];

export interface NavLink {
  label: string;
  href: string;
  /** Prefixos de rota que também marcam o link como ativo. */
  match?: string[];
}

export const mainNav: NavLink[] = [
  { label: 'Camisas', href: '/camisas', match: ['/camisas'] },
  { label: 'Times', href: '/times', match: ['/times'] },
  { label: 'Seleções', href: '/selecoes', match: ['/selecoes'] },
  { label: 'Retrô', href: '/retro', match: ['/retro'] },
  { label: 'Kits', href: '/kits', match: ['/kits'] },
];

export const accountNav: NavLink[] = [
  { label: 'Minha conta', href: '/conta' },
  { label: 'Meus pedidos', href: '/conta/pedidos' },
  { label: 'Dados pessoais', href: '/conta/dados' },
  { label: 'Endereços', href: '/conta/enderecos' },
];

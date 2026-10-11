/** Conteúdo institucional e de navegação da loja. */

export const site = {
  name: 'FUTZONE',
  tagline: 'Vista o manto. Entre em campo.',
  description: 'Camisas de clubes, seleções, retrô e kits, com fotos reais, preço e tamanhos à vista.',
  contactEmail: 'contato@futzone.com.br',
  /** Perfis oficiais. Deixe `href` vazio até o perfil existir — links vazios não aparecem. */
  social: [
    { name: 'Instagram', href: '' },
    { name: 'TikTok', href: '' },
    { name: 'WhatsApp', href: '' },
  ] as Array<{ name: string; href: string }>,
};

/** Referência a um produto do catálogo pelo time e slug (ex.: URL /camisas/brasil/...). */
export interface ProductRef {
  teamId: string;
  slug: string;
}

/**
 * Fileira de armários do hero (4 camisas, da esquerda para a direita, na ordem
 * em que as luzes acendem). Se alguma sair do catálogo ou esgotar, a Home
 * completa a fileira com as camisas mais procuradas.
 */
export const heroShowcase: ProductRef[] = [
  { teamId: 'flamengo', slug: 'camisa-jogador-flamengo-listrada-i-26-27' },
  { teamId: 'brasil', slug: 'camisa-torcedor-selecao-brasil-amarela-i-26-27' },
  { teamId: 'palmeiras', slug: 'camisa-palmeiras-verde-i-26-27' },
  { teamId: 'psg', slug: 'camisa-psg-i-2026-27-azul-e-vermelho' },
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

/**
 * Faixa retrô da Home: três camisas do MESMO ano (o ano aparece em destaque
 * ao lado das fotos, então precisa ser o ano verdadeiro delas).
 */
export const retroShowcase: ProductRef[] = [
  { teamId: 'botafogo', slug: 'camisa-retro-botafogo-listrada-1995' },
  { teamId: 'flamengo', slug: 'camisa-retro-flamengo-1995' },
  { teamId: 'botafogo', slug: 'camisa-retro-botafogo-preta-1995' },
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
  { label: 'Meus pedidos', href: '/conta/pedidos', match: ['/conta/pedidos'] },
  { label: 'Meus endereços', href: '/conta/enderecos' },
  { label: 'Dados pessoais', href: '/conta/perfil' },
  { label: 'Segurança', href: '/conta/seguranca' },
  { label: 'Favoritos', href: '/conta/favoritos' },
  { label: 'Notificações', href: '/conta/notificacoes' },
];

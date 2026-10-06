/** Conteúdo institucional e de navegação da loja. */

export const site = {
  name: 'FUTZONE',
  tagline: 'Vista a paixão pelo futebol.',
  /**
   * Imagem do hero. Quando `null`, o hero usa a composição ilustrada da marca.
   * Substitua por uma foto licenciada (ex.: '/brand/hero.jpg' em /public).
   */
  heroImage: null as string | null,
  contactEmail: 'contato@futzone.com.br',
  freeShippingFrom: 29900,
};

export interface NavLink {
  label: string;
  href: string;
  /** Prefixos de rota que também marcam o link como ativo. */
  match?: string[];
}

export const mainNav: NavLink[] = [
  { label: 'Início', href: '/' },
  { label: 'Camisas', href: '/camisas', match: ['/camisas'] },
  { label: 'Times', href: '/times', match: ['/times'] },
  { label: 'Retrô', href: '/retro', match: ['/retro'] },
  { label: 'Kits', href: '/kits', match: ['/kits'] },
  { label: 'Promoções', href: '/promocoes', match: ['/promocoes'] },
];

export const accountNav: NavLink[] = [
  { label: 'Minha conta', href: '/conta' },
  { label: 'Meus pedidos', href: '/conta/pedidos' },
  { label: 'Dados pessoais', href: '/conta/dados' },
  { label: 'Endereços', href: '/conta/enderecos' },
];

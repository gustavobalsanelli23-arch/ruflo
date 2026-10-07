import type { CategoryId, Product, ProductGender, ProductTag, Size } from '@/types/catalog';
import { ADULT_SIZES, KIDS_SIZES } from '@/types/catalog';
import { teams } from './teams';

/**
 * Catálogo inicial (dados de exemplo).
 *
 * Para adicionar produtos, inclua uma nova chamada `define({...})` abaixo —
 * nenhum componente precisa ser alterado. Quando a API do fornecedor estiver
 * disponível, `services/productRepository.ts` passa a buscar desses endpoints
 * e este arquivo vira apenas a semente de desenvolvimento.
 *
 * Imagens: `images` fica vazio até existirem fotos reais e licenciadas do
 * produto. Sem imagem, a interface mostra um placeholder ilustrativo nas cores
 * do time — nunca uma foto inventada.
 */

const DEFAULT_DETAILS: Record<CategoryId, string[]> = {
  clubes: ['Tecido 100% poliéster com tecnologia de secagem rápida', 'Escudo e patrocínios aplicados', 'Gola careca com acabamento em ribana', 'Modelagem torcedor'],
  selecoes: ['Tecido leve e respirável', 'Escudo da federação aplicado', 'Modelagem torcedor', 'Acabamento com costuras reforçadas'],
  retro: ['Releitura inspirada no modelo original', 'Tecido com toque de algodão', 'Gola polo ou V conforme o modelo da época', 'Escudo bordado'],
  kits: ['Kit com camisa e calção', 'Tecido macio e resistente', 'Cós elástico com cordão ajustável', 'Ideal para crianças'],
  femininas: ['Modelagem baby look', 'Tecido leve com elastano', 'Escudo aplicado', 'Gola careca'],
};

interface Seed {
  id: string;
  name: string;
  slug: string;
  teamId: string;
  category: CategoryId;
  season: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  stock: number[];
  tags?: ProductTag[];
  gender?: ProductGender;
  salesCount: number;
  createdAt: string;
  palette?: { primary: string; secondary: string };
  status?: Product['status'];
  /** Fotos reais em /public (ex.: '/produtos/<slug>/1.jpg'). */
  images?: string[];
}

function define(seed: Seed): Product {
  const team = teams.find((t) => t.id === seed.teamId);
  if (!team) throw new Error(`Time desconhecido em produto ${seed.id}: ${seed.teamId}`);
  const isKids = seed.category === 'kits';
  const sizes: Size[] = isKids ? KIDS_SIZES : ADULT_SIZES;
  const stock = Object.fromEntries(sizes.map((s, i) => [s, seed.stock[i] ?? 0])) as Partial<Record<Size, number>>;
  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    teamId: seed.teamId,
    category: seed.category,
    season: seed.season,
    gender: seed.gender ?? (isKids ? 'infantil' : seed.category === 'femininas' ? 'feminino' : 'masculino'),
    description: seed.description,
    details: DEFAULT_DETAILS[seed.category],
    price: seed.price,
    compareAtPrice: seed.compareAtPrice,
    sizes,
    stock,
    images: (seed.images ?? []).map((src, i) => ({ src, alt: i === 0 ? seed.name : `${seed.name} — foto ${i + 1}` })),
    palette: seed.palette ?? team.colors,
    status: seed.status ?? 'published',
    tags: seed.tags ?? [],
    salesCount: seed.salesCount,
    createdAt: seed.createdAt,
  };
}

export const seedProducts: Product[] = [
  // ── Catálogo FutZone (fotos reais) ────────────────────────
  // Preços e estoques destes itens são PROVISÓRIOS — ajustar com os valores reais.
  ...[
    { n: '001', name: 'Camisa Feminina Palmeiras Azul III 26/27', slug: 'camisa-feminina-palmeiras-azul-iii-26-27', teamId: 'palmeiras', category: 'femininas', season: '26/27', price: 32990, tags: ['lancamento'] },
    { n: '002', name: 'Camisa Retrô Arsenal Vinho 2005/06', slug: 'camisa-retro-arsenal-vinho-2005-06', teamId: 'arsenal', category: 'retro', season: '2005/06', price: 25990, tags: ['popular'] },
    { n: '003', name: 'Kit Infantil Flamengo Listrado I 26/27', slug: 'kit-infantil-flamengo-listrado-i-26-27', teamId: 'flamengo', category: 'kits', season: '26/27', price: 24990, tags: ['mais-vendido', 'lancamento'] },
    { n: '004', name: 'Camisa Sport Listrada I 2026/27', slug: 'camisa-sport-listrada-i-2026-27', teamId: 'sport', category: 'clubes', season: '2026/27', price: 34990, tags: ['lancamento'] },
    { n: '007', name: 'Camisa Goleiro Botafogo Azul 26/27', slug: 'camisa-goleiro-botafogo-azul-26-27', teamId: 'botafogo', category: 'clubes', season: '26/27', price: 34990, tags: ['lancamento'] },
    { n: '008', name: 'Camisa Olympique de Marseille I 25/26', slug: 'camisa-olympique-de-marseille-i-25-26', teamId: 'marseille', category: 'clubes', season: '25/26', price: 42990, tags: ['popular'] },
    { n: '009', name: 'Camisa PSG I 2026/27 Azul e Vermelho', slug: 'camisa-psg-i-2026-27-azul-e-vermelho', teamId: 'psg', category: 'clubes', season: '2026/27', price: 42990, tags: ['mais-vendido', 'lancamento'] },
    { n: '010', name: 'Camisa Real Madrid Goleiro 25/26', slug: 'camisa-real-madrid-goleiro-25-26', teamId: 'real-madrid', category: 'clubes', season: '25/26', price: 42990, tags: [] },
    { n: '011', name: 'Camisa Real Madrid II 25/26', slug: 'camisa-real-madrid-ii-25-26', teamId: 'real-madrid', category: 'clubes', season: '25/26', price: 42990, tags: ['popular'] },
    { n: '012', name: 'Camisa Palmeiras Listrada 25/26', slug: 'camisa-palmeiras-listrada-25-26', teamId: 'palmeiras', category: 'clubes', season: '25/26', price: 34990, tags: ['mais-vendido'] },
    { n: '014', name: 'Camisa Retrô Corinthians 2011/12', slug: 'camisa-retro-corinthians-2011-12', teamId: 'corinthians', category: 'retro', season: '2011/12', price: 25990, tags: ['mais-vendido'] },
    { n: '015', name: 'Kit Infantil Cruzeiro I - Short azul', slug: 'kit-infantil-cruzeiro-i-short-azul', teamId: 'cruzeiro', category: 'kits', season: '', price: 24990, tags: ['popular'] },
  ].map((r, i) =>
    define({
      id: `fz-${r.n}`,
      name: r.name,
      slug: r.slug,
      teamId: r.teamId,
      category: r.category as CategoryId,
      season: r.season,
      price: r.price,
      description: `${r.name}. Produto do catálogo FutZone.`,
      stock: r.category === 'kits' ? [3, 5, 6, 5, 4, 2] : [3, 8, 10, 8, 5, 2],
      tags: r.tags as ProductTag[],
      salesCount: 1500 - i * 10,
      createdAt: '2026-10-07',
      images: [`/produtos/${r.slug}/1.jpg`],
    }),
  ),

  // ── Produtos de demonstração (sem foto) ───────────────────
  // ── Clubes ────────────────────────────────────────────────
  define({ id: 'p-001', name: 'Camisa Flamengo 26/27 I', slug: 'camisa-flamengo-26-27', teamId: 'flamengo', category: 'clubes', season: '26/27', price: 34990, description: 'O manto rubro-negro da nova temporada. Leve, confortável e pronta para o Maracanã lotado.', stock: [4, 12, 18, 15, 8, 3], tags: ['mais-vendido', 'lancamento'], salesCount: 980, createdAt: '2026-09-20' }),
  define({ id: 'p-002', name: 'Camisa Palmeiras 26/27 I', slug: 'camisa-palmeiras-26-27', teamId: 'palmeiras', category: 'clubes', season: '26/27', price: 34990, description: 'O verde alviverde em sua versão mais atual, com tecido respirável para os 90 minutos.', stock: [3, 10, 14, 11, 6, 2], tags: ['mais-vendido'], salesCount: 870, createdAt: '2026-08-28' }),
  define({ id: 'p-003', name: 'Camisa Corinthians 26/27 I', slug: 'camisa-corinthians-26-27', teamId: 'corinthians', category: 'clubes', season: '26/27', price: 29990, compareAtPrice: 34990, description: 'O branco tradicional do Timão com detalhes em preto. Clássica e versátil.', stock: [2, 9, 13, 10, 5, 0], tags: ['popular', 'mais-vendido'], salesCount: 812, createdAt: '2026-07-15' }),
  define({ id: 'p-004', name: 'Camisa São Paulo 26/27 I', slug: 'camisa-sao-paulo-26-27', teamId: 'sao-paulo', category: 'clubes', season: '26/27', price: 34990, description: 'A camisa tricolor com as faixas que são marca registrada do Morumbi.', stock: [1, 6, 8, 7, 3, 1], tags: ['popular'], salesCount: 540, createdAt: '2026-07-30' }),
  define({ id: 'p-005', name: 'Camisa Fluminense 26/27 I', slug: 'camisa-fluminense-26-27', teamId: 'fluminense', category: 'clubes', season: '26/27', price: 27990, compareAtPrice: 34990, description: 'O tricolor das Laranjeiras em uma camisa leve, pensada para o calor do Rio.', stock: [0, 4, 6, 5, 2, 0], salesCount: 410, createdAt: '2026-06-18' }),
  define({ id: 'p-006', name: 'Camisa Vasco 26/27 I', slug: 'camisa-vasco-26-27', teamId: 'vasco', category: 'clubes', season: '26/27', price: 34990, description: 'O preto com a faixa diagonal que atravessa gerações de vascaínos.', stock: [3, 7, 9, 8, 4, 2], tags: ['lancamento'], salesCount: 388, createdAt: '2026-09-28' }),
  define({ id: 'p-007', name: 'Camisa Real Madrid 26/27 I', slug: 'camisa-real-madrid-26-27', teamId: 'real-madrid', category: 'clubes', season: '26/27', price: 42990, description: 'O branco merengue, símbolo de uma das camisas mais vitoriosas da Europa.', stock: [2, 8, 11, 9, 4, 1], tags: ['mais-vendido'], salesCount: 760, createdAt: '2026-08-05' }),
  define({ id: 'p-008', name: 'Camisa Barcelona 26/27 I', slug: 'camisa-barcelona-26-27', teamId: 'barcelona', category: 'clubes', season: '26/27', price: 42990, description: 'O blaugrana catalão em uma versão moderna e cheia de personalidade.', stock: [1, 5, 7, 6, 2, 0], tags: ['popular'], salesCount: 690, createdAt: '2026-08-12' }),
  define({ id: 'p-009', name: 'Camisa Manchester City 26/27 I', slug: 'camisa-manchester-city-26-27', teamId: 'manchester-city', category: 'clubes', season: '26/27', price: 35990, compareAtPrice: 42990, description: 'O azul-celeste dos Citizens, leve e elegante dentro e fora de campo.', stock: [0, 3, 4, 3, 1, 0], salesCount: 455, createdAt: '2026-07-22' }),
  define({ id: 'p-010', name: 'Camisa Liverpool 26/27 I', slug: 'camisa-liverpool-26-27', teamId: 'liverpool', category: 'clubes', season: '26/27', price: 42990, description: 'O vermelho de Anfield para quem nunca caminha sozinho.', stock: [2, 6, 9, 7, 3, 1], tags: ['lancamento'], salesCount: 498, createdAt: '2026-09-25' }),
  define({ id: 'p-011', name: 'Camisa PSG 26/27 I', slug: 'camisa-psg-26-27', teamId: 'psg', category: 'clubes', season: '26/27', price: 42990, description: 'O azul-marinho parisiense com detalhes em vermelho e branco.', stock: [1, 4, 6, 5, 2, 1], tags: ['popular'], salesCount: 610, createdAt: '2026-08-20' }),
  define({ id: 'p-012', name: 'Camisa Bayern 26/27 I', slug: 'camisa-bayern-26-27', teamId: 'bayern', category: 'clubes', season: '26/27', price: 42990, description: 'O vermelho bávaro, sinônimo de tradição e de títulos.', stock: [0, 0, 0, 0, 0, 0], salesCount: 302, createdAt: '2026-07-02' }),

  // ── Seleções ──────────────────────────────────────────────
  define({ id: 'p-013', name: 'Camisa Brasil 2026 I', slug: 'camisa-brasil-2026', teamId: 'brasil', category: 'selecoes', season: '2026', price: 39990, description: 'A amarelinha. A camisa mais famosa do futebol mundial, pronta para o próximo grito de gol.', stock: [6, 20, 25, 22, 12, 5], tags: ['mais-vendido', 'popular'], salesCount: 1240, createdAt: '2026-05-10' }),
  define({ id: 'p-014', name: 'Camisa Brasil 2026 II', slug: 'camisa-brasil-2026-ii', teamId: 'brasil', category: 'selecoes', season: '2026', price: 39990, description: 'O azul histórico da Seleção, a camisa das grandes viradas.', stock: [3, 9, 12, 10, 6, 2], tags: ['popular'], salesCount: 720, createdAt: '2026-05-10', palette: { primary: '#0033A0', secondary: '#FFDF00' } }),
  define({ id: 'p-015', name: 'Camisa Argentina 2026 I', slug: 'camisa-argentina-2026', teamId: 'argentina', category: 'selecoes', season: '2026', price: 33990, compareAtPrice: 39990, description: 'As listras celeste e branca da Albiceleste.', stock: [2, 6, 8, 7, 3, 1], tags: ['popular'], salesCount: 530, createdAt: '2026-05-12' }),
  define({ id: 'p-016', name: 'Camisa França 2026 I', slug: 'camisa-franca-2026', teamId: 'franca', category: 'selecoes', season: '2026', price: 39990, description: 'O azul profundo dos Bleus com detalhes em vermelho.', stock: [1, 4, 5, 4, 2, 0], salesCount: 280, createdAt: '2026-05-15' }),
  define({ id: 'p-017', name: 'Camisa Portugal 2026 I', slug: 'camisa-portugal-2026', teamId: 'portugal', category: 'selecoes', season: '2026', price: 39990, description: 'O vermelho e verde da Seleção das Quinas.', stock: [2, 5, 7, 6, 3, 1], tags: ['lancamento'], salesCount: 340, createdAt: '2026-09-30' }),

  // ── Retrô ─────────────────────────────────────────────────
  define({ id: 'p-018', name: 'Camisa Retrô Brasil 1970', slug: 'camisa-retro-brasil-1970', teamId: 'brasil', category: 'retro', season: '1970', price: 25990, description: 'Releitura da camisa do tricampeonato, com gola careca verde e tecido de toque macio.', stock: [2, 8, 10, 9, 5, 2], tags: ['mais-vendido'], salesCount: 905, createdAt: '2026-03-02' }),
  define({ id: 'p-019', name: 'Camisa Retrô Flamengo 1981', slug: 'camisa-retro-flamengo-1981', teamId: 'flamengo', category: 'retro', season: '1981', price: 25990, description: 'Homenagem ao time campeão do mundo, com gola V e escudo bordado.', stock: [1, 5, 7, 6, 2, 1], tags: ['popular'], salesCount: 640, createdAt: '2026-02-14' }),
  define({ id: 'p-020', name: 'Camisa Retrô Milan 1989/90', slug: 'camisa-retro-milan-1989-90', teamId: 'milan', category: 'retro', season: '1989/90', price: 21990, compareAtPrice: 27990, description: 'Inspirada no lendário Milan bicampeão europeu, em listras rossonere.', stock: [0, 2, 3, 2, 1, 0], salesCount: 350, createdAt: '2026-01-20' }),
  define({ id: 'p-021', name: 'Camisa Retrô Holanda 1988', slug: 'camisa-retro-holanda-1988', teamId: 'holanda', category: 'retro', season: '1988', price: 25990, description: 'O laranja da campeã europeia de 1988, um clássico do design esportivo.', stock: [1, 3, 4, 4, 2, 0], salesCount: 260, createdAt: '2026-04-08' }),
  define({ id: 'p-022', name: 'Camisa Retrô Boca Juniors 2000', slug: 'camisa-retro-boca-juniors-2000', teamId: 'boca-juniors', category: 'retro', season: '2000', price: 25990, description: 'O azul e ouro de La Bombonera, inspirada na era de ouro do clube.', stock: [1, 4, 5, 4, 2, 1], tags: ['lancamento'], salesCount: 190, createdAt: '2026-09-18' }),

  // ── Kits ──────────────────────────────────────────────────
  define({ id: 'p-023', name: 'Kit Infantil Flamengo 26/27', slug: 'kit-infantil-flamengo-26-27', teamId: 'flamengo', category: 'kits', season: '26/27', price: 24990, description: 'Camisa e calção para o pequeno torcedor rubro-negro.', stock: [3, 6, 8, 7, 5, 2], tags: ['popular'], salesCount: 470, createdAt: '2026-09-21' }),
  define({ id: 'p-024', name: 'Kit Infantil Brasil 2026', slug: 'kit-infantil-brasil-2026', teamId: 'brasil', category: 'kits', season: '2026', price: 24990, description: 'O uniforme completo da Seleção em tamanho infantil.', stock: [4, 8, 10, 9, 6, 3], tags: ['mais-vendido'], salesCount: 620, createdAt: '2026-05-11' }),
  define({ id: 'p-025', name: 'Kit Infantil Palmeiras 26/27', slug: 'kit-infantil-palmeiras-26-27', teamId: 'palmeiras', category: 'kits', season: '26/27', price: 19990, compareAtPrice: 24990, description: 'Camisa e calção alviverdes para os pequenos palmeirenses.', stock: [1, 2, 3, 2, 1, 0], salesCount: 230, createdAt: '2026-08-29' }),

  // ── Femininas ─────────────────────────────────────────────
  define({ id: 'p-026', name: 'Camisa Feminina Brasil 2026 I', slug: 'camisa-feminina-brasil-2026', teamId: 'brasil', category: 'femininas', season: '2026', price: 37990, description: 'A amarelinha em modelagem baby look, leve e confortável.', stock: [5, 10, 12, 8, 4, 0], tags: ['mais-vendido'], salesCount: 560, createdAt: '2026-05-10' }),
  define({ id: 'p-027', name: 'Camisa Feminina Corinthians 26/27 I', slug: 'camisa-feminina-corinthians-26-27', teamId: 'corinthians', category: 'femininas', season: '26/27', price: 32990, description: 'O manto alvinegro com modelagem feminina e caimento ajustado.', stock: [2, 5, 6, 4, 2, 0], tags: ['lancamento'], salesCount: 240, createdAt: '2026-09-26' }),
  define({ id: 'p-028', name: 'Camisa Feminina Flamengo 26/27 I', slug: 'camisa-feminina-flamengo-26-27', teamId: 'flamengo', category: 'femininas', season: '26/27', price: 29990, compareAtPrice: 34990, description: 'O rubro-negro em versão baby look para a torcedora mais apaixonada.', stock: [1, 4, 5, 3, 1, 0], tags: ['popular'], salesCount: 380, createdAt: '2026-09-20' }),
  define({ id: 'p-029', name: 'Camisa Feminina Palmeiras 26/27 I', slug: 'camisa-feminina-palmeiras-26-27', teamId: 'palmeiras', category: 'femininas', season: '26/27', price: 32990, description: 'Rascunho de cadastro — aguardando fotos oficiais do fornecedor.', stock: [0, 3, 4, 3, 1, 0], salesCount: 0, createdAt: '2026-10-01', status: 'draft' }),
];

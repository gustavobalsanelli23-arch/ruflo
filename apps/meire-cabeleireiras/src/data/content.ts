// Conteúdo editável do site: especialidades, galeria e textos.
// As fotos vêm de src/data/images.generated.json (gerado por `npm run images`).
import type images from './images.generated.json';

export type ImageKey = keyof typeof images;

// ── Especialidades ─────────────────────────────────────────────────────────
// SUGESTÃO baseada nas fotos e legendas do Instagram; confirme com a Meire.
// Para retirar um serviço, apague o item; para trocar a foto, mude `image`.
// `photoNote` diz o que a foto realmente mostra (aparece como legenda).

export interface Specialty {
  id: string;
  name: string;
  description: string;
  image: ImageKey;
  alt: string;
  photoNote: string;
}

export const specialties: Specialty[] = [
  {
    id: 'mechas',
    name: 'Mechas e iluminação',
    description: 'Mechas finas e pontos de luz que acompanham o movimento do cabelo, para um loiro com profundidade.',
    image: 'mechas-loiras',
    alt: 'Cabelo longo com mechas loiras e ondas, preso parcialmente com uma piranha',
    photoNote: 'Mechas loiras e corte degradê',
  },
  {
    id: 'loiros',
    name: 'Loiros personalizados',
    description:
      'Bege, champagne, perolado ou manteiga: o tom é escolhido para a sua pele e pode ajudar a disfarçar os fios brancos.',
    image: 'bege-dourado-costas',
    alt: 'Cabelo loiro bege dourado, longo, com ondas largas, visto de costas',
    photoNote: 'Loiro bege dourado',
  },
  {
    id: 'coloracao',
    name: 'Coloração e tons ruivos',
    description: 'Cor uniforme, correção de tons indesejados e nuances acobreadas, cuidando da saúde dos fios.',
    image: 'correcao-de-cor',
    alt: 'Cliente de perfil, com cabelo loiro claro na altura dos ombros após correção de cor',
    photoNote: 'Correção de cor',
  },
  {
    id: 'cortes',
    name: 'Cortes e camadas',
    description: 'Camadas que dão leveza e movimento, inclusive para quem quer manter o comprimento.',
    image: 'bege-dourado',
    alt: 'Cabelo loiro em camadas, com as pontas modeladas para fora, visto de lado',
    photoNote: 'Camadas no loiro bege dourado',
  },
  {
    id: 'escova',
    name: 'Escova e finalização',
    description: 'Do liso espelhado às ondas soltas, a finalização certa para o dia a dia ou para um compromisso.',
    image: 'liso',
    alt: 'Cabelo escuro, longo e liso, com brilho, visto de costas',
    photoNote: 'Liso com brilho',
  },
  {
    id: 'penteados',
    name: 'Penteados',
    description: 'Ondas modeladas e penteados para festas, eventos e ocasiões especiais.',
    image: 'escova-modelada',
    alt: 'Cabelo longo com mechas loiras e cachos largos modelados, visto de costas',
    photoNote: 'Escova modelada',
  },
];

// ── Galeria ────────────────────────────────────────────────────────────────
// Só trabalhos reais da Meire. Filtros sem nenhuma foto ficam escondidos
// automaticamente: basta marcar a categoria em uma foto nova para ele aparecer.

export const categories = [
  { id: 'loiros', label: 'Loiros' },
  { id: 'mechas', label: 'Mechas' },
  { id: 'ruivos', label: 'Ruivos' },
  { id: 'cortes', label: 'Cortes' },
  { id: 'penteados', label: 'Penteados' },
  { id: 'escova', label: 'Escova' },
] as const;

export type CategoryId = (typeof categories)[number]['id'];

export interface Work {
  image: ImageKey;
  title: string;
  alt: string;
  categories: CategoryId[];
  /** Legenda original do post (sem hashtags quando ela é só hashtag). */
  caption?: string;
  /** Data do post, AAAA-MM-DD. */
  date: string;
  post: string;
  /** Exibe menor na galeria (fotos de detalhe ou de resolução baixa). */
  small?: boolean;
}

export const works: Work[] = [
  {
    image: 'escova-modelada',
    title: 'Escova modelada',
    alt: 'Cabelo longo com mechas loiras e cachos largos modelados, visto de costas diante de uma parede de folhagens e flores rosas',
    categories: ['loiros', 'escova'],
    date: '2026-09-19',
    post: 'https://www.instagram.com/reel/Ddd-edAMCc5/',
  },
  {
    image: 'correcao-de-cor',
    title: 'Correção de cor',
    alt: 'Cliente de perfil, com cabelo loiro claro na altura dos ombros e pontas viradas',
    categories: ['loiros'],
    caption: 'Cabelo em transformação, um antes e depois de tirar o fôlego ✨',
    date: '2026-10-03',
    post: 'https://www.instagram.com/reel/DeCItbnsSLG/',
  },
  {
    image: 'mechas-loiras',
    title: 'Mechas loiras e corte degradê',
    alt: 'Cabelo longo com mechas loiras e ondas, preso parcialmente com uma piranha preta',
    categories: ['loiros', 'mechas', 'cortes'],
    date: '2026-09-19',
    post: 'https://www.instagram.com/reel/Ddd98uLsM2n/',
  },
  {
    image: 'bege-dourado',
    title: 'Loiro bege dourado',
    alt: 'Cabelo loiro bege dourado em camadas, com as pontas modeladas, visto de lado',
    categories: ['loiros'],
    caption: 'Loiro bege dourado, o melhor tom para camuflar cabelos brancos.',
    date: '2026-05-07',
    post: 'https://www.instagram.com/reel/DYDhVvisy0g/',
  },
  {
    image: 'liso',
    title: 'Liso com brilho',
    alt: 'Cabelo escuro, longo e liso, com brilho, visto de costas',
    categories: ['escova'],
    date: '2026-06-29',
    post: 'https://www.instagram.com/reel/DaLonpMswAa/',
    small: true,
  },
  {
    image: 'loiro-manteiga',
    title: 'Loiro manteiga, corte e modelagem',
    alt: 'Detalhe de fios loiros cor de manteiga, com camadas e movimento',
    categories: ['loiros', 'cortes'],
    caption: 'Loiro manteiga, corte e modelagem ❣️',
    date: '2026-06-29',
    post: 'https://www.instagram.com/reel/DaLrdMfss_h/',
    small: true,
  },
  {
    image: 'bege-dourado-costas',
    title: 'Loiro bege dourado, de costas',
    alt: 'Cabelo loiro bege dourado, longo, com ondas largas, visto de costas',
    categories: ['loiros'],
    caption: 'Loiro bege dourado, o melhor tom para camuflar cabelos brancos.',
    date: '2026-05-07',
    post: 'https://www.instagram.com/reel/DYDhVvisy0g/',
  },
];

/** Posts mais recentes, para a seção do Instagram (um por post, do mais novo). */
export const latestPosts: Work[] = [...new Map(works.map((w) => [w.post, w])).values()].sort((a, b) =>
  b.date.localeCompare(a.date),
);

/** Categorias com pelo menos uma foto, na ordem definida acima. */
export function visibleCategories(list: Work[] = works) {
  return categories
    .map((c) => ({ ...c, count: list.filter((w) => w.categories.includes(c.id)).length }))
    .filter((c) => c.count > 0);
}

export function filterWorks(filter: CategoryId | 'todos', list: Work[] = works): Work[] {
  return filter === 'todos' ? list : list.filter((w) => w.categories.includes(filter));
}

const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-09-19" → "setembro de 2026" (em UTC: o mesmo resultado no build e no navegador). */
export function monthYear(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return monthFormat.format(Date.UTC(year, month - 1, day));
}

// ── Textos ─────────────────────────────────────────────────────────────────
// TEXTO PROVISÓRIO: a apresentação abaixo não traz dados pessoais, tempo de
// carreira nem formação. Substitua pela história da Meire quando ela enviar.

export const about = {
  paragraphs: [
    'Por trás de cada loiro iluminado e de cada onda bem marcada está o olhar da Meire Costa. O atendimento começa por uma conversa: o que você deseja, o que o seu cabelo já viveu e o que combina com a sua rotina.',
    'A partir daí, cor, corte e finalização são pensados juntos, para um resultado que respeita os fios e parece seu, na melhor versão.',
  ],
};

export const bookingSteps = [
  {
    title: 'Envie uma mensagem',
    text: 'Conte qual serviço você deseja. Se puder, mande uma foto do seu cabelo hoje e uma referência do que imagina.',
  },
  { title: 'Combine o horário', text: 'Vocês combinam o melhor dia e horário para o atendimento.' },
  { title: 'Venha ao salão', text: 'No dia marcado, é só chegar e aproveitar o seu momento.' },
];

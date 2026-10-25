// Conteúdo editável do site: fotos, serviços, galeria e textos.
// As fotos otimizadas vêm de src/data/images.generated.json (gerado por
// `npm run images` a partir dos originais em assets/fotos/; a origem de cada
// uma — post, data e legenda — está em assets/fotos/manifest.json).
//
// FONTE: Instagram oficial @ferbarber.brandt ("Barbearia Brandt"), lido em
// 24/10/2026: foto de perfil (o emblema), os 6 posts públicos mais recentes,
// suas legendas e a marcação de local "Alto Benedito Novo".

// ── Fotos ──────────────────────────────────────────────────────────────────
// Cada espaço de foto do site tem um `id`. Sem o arquivo, o site mostra uma
// placa com o `brief` (o que deve ir ali). Para trocar uma foto: substitua o
// original em assets/fotos/<id>.jpg, rode `npm run images` e revise o `alt`.

export interface PhotoSlot {
  id: string;
  /** O que deve ir neste espaço. */
  brief: string;
  /** Proporção (largura / altura) da placa enquanto a foto não chega. */
  ratio: number;
  /** Texto alternativo: o que a foto realmente mostra. */
  alt?: string;
  /** Post de origem no Instagram e data (AAAA-MM-DD), para o crédito. */
  post?: string;
  date?: string;
}

export const photos = {
  hero: {
    id: 'hero',
    brief: 'Foto principal: um corte finalizado, de perfil ou de costas.',
    ratio: 1,
    alt: 'Degradê visto de trás, com a nuca marcada, diante da porta de madeira escura da barbearia',
    post: 'https://www.instagram.com/p/De1lASVkaRk/',
    date: '2026-10-23',
  },
  ambiente: {
    id: 'ambiente',
    brief: 'O ambiente da barbearia: cadeira, espelho e bancada.',
    ratio: 640 / 1136,
    alt: 'A bancada de madeira vista de cima: máquina dourada, tesouras, pentes, pentes de máquina e navalhas organizados',
  },
  detalhe: {
    id: 'detalhe',
    brief: 'Um detalhe do trabalho: mãos, navalha, tesoura ou acabamento.',
    ratio: 1080 / 1440,
    alt: 'Corte social feito na tesoura, visto de trás',
  },
} satisfies Record<string, PhotoSlot>;

// ── Serviços ───────────────────────────────────────────────────────────────
// Só o que aparece no Instagram: "Barba e cabelo" (o emblema), "degradê na
// zero" e "corte social todo na tesoura" (legendas). Preço e duração só
// aparecem quando confirmados (ex.: price: 'R$ 40', duration: '40 min').

export interface Service {
  id: string;
  name: string;
  description: string;
  /** Onde o serviço foi visto (para conferência). */
  source: string;
  price?: string;
  duration?: string;
}

export const services: Service[] = [
  {
    id: 'degrade',
    name: 'Degradê',
    description: 'Do degradê na zero à nuca bem marcada, com a transição limpa de quem cuida do detalhe.',
    source: 'post de 29/09/2026: "degrade na zero"',
  },
  {
    id: 'social',
    name: 'Social na tesoura',
    description: 'O corte social feito todo na tesoura — também para os pequenos.',
    source: 'post de 16/10/2026: "Corte social todo na tesoura"',
  },
  {
    id: 'barba',
    name: 'Barba',
    description: 'A outra metade do emblema da casa: barba e cabelo.',
    source: 'emblema da foto de perfil: "BARBA E CABELO"',
  },
];

// ── Antes e depois ─────────────────────────────────────────────────────────
// Pares publicados pela própria barbearia ("arraste ao lado para ver o antes").

export interface Transformation {
  id: string;
  title: string;
  before: PhotoSlot;
  after: PhotoSlot;
  caption: string;
  date: string;
  post: string;
}

export const transformations: Transformation[] = [
  {
    id: 'glow-up',
    title: 'Degradê',
    before: { id: 'antes-01', brief: 'O antes, no mesmo ângulo do depois.', ratio: 1, alt: 'Antes: cabelo comprido e volumoso, visto de lado' },
    after: { id: 'depois-01', brief: 'O depois, no mesmo ângulo do antes.', ratio: 1, alt: 'Depois: degradê com o topo mais curto, visto de lado' },
    caption: 'Mudança boa, hein?!',
    date: '2026-10-23',
    post: 'https://www.instagram.com/p/De1lASVkaRk/',
  },
  {
    id: 'alinhou',
    title: 'Degradê',
    before: { id: 'antes-02', brief: 'O antes, no mesmo ângulo do depois.', ratio: 1, alt: 'Antes: cabelo cacheado e volumoso, visto de trás' },
    after: { id: 'depois-02', brief: 'O depois, no mesmo ângulo do antes.', ratio: 1, alt: 'Depois: degradê baixo com o topo curto, visto de trás' },
    caption: 'Ele já alinhou o visual, e você? Bora!',
    date: '2026-10-13',
    post: 'https://www.instagram.com/p/DecrZM7CRlS/',
  },
];

// ── Galeria ────────────────────────────────────────────────────────────────
// Só trabalhos reais, publicados pela barbearia. `post` é o link do post no
// Instagram; `date` no formato AAAA-MM-DD; `caption`, a legenda original
// (sem hashtags). A ordem define o grid editorial (ver Gallery.tsx).

export interface Work {
  photo: PhotoSlot;
  title?: string;
  /** Legenda original do post. */
  caption?: string;
  date?: string;
  post?: string;
}

const SOCIAL = {
  title: 'Social na tesoura',
  caption: 'Corte social todo na tesoura ✂️ um charme esse menino, né?!',
  date: '2026-10-16',
  post: 'https://www.instagram.com/p/DekBK2tiXhL/',
};

export const works: Work[] = [
  {
    photo: { id: 'trabalho-01', brief: 'Um trabalho publicado no Instagram da barbearia.', ratio: 1, alt: 'Homem de perfil na cadeira, com degradê na zero nas laterais' },
    title: 'Degradê na zero',
    caption: 'Jogador caro ✔️ Degradê na zero. Quer deixar seu visual no estilo desse jogador aí? Só chegar!',
    date: '2026-09-29',
    post: 'https://www.instagram.com/p/Dd35_zPRBg2/',
  },
  {
    photo: { id: 'trabalho-02', brief: 'Um trabalho publicado no Instagram da barbearia.', ratio: 3 / 4, alt: 'Menino de perfil com corte social feito na tesoura' },
    ...SOCIAL,
  },
  {
    photo: { id: 'trabalho-03', brief: 'Um trabalho publicado no Instagram da barbearia.', ratio: 1, alt: 'Menino de perfil com degradê baixo e o topo curto' },
    title: 'Degradê',
    caption: 'Depois/antes: ele já alinhou o visual, e você? Bora!',
    date: '2026-10-13',
    post: 'https://www.instagram.com/p/DecrZM7CRlS/',
  },
  {
    photo: { id: 'trabalho-04', brief: 'Um trabalho publicado no Instagram da barbearia.', ratio: 3 / 4, alt: 'Corte social na tesoura visto de lado, com o cabelo penteado para trás' },
    ...SOCIAL,
  },
  {
    photo: { id: 'trabalho-05', brief: 'Um trabalho publicado no Instagram da barbearia.', ratio: 3 / 4, alt: 'Corte social na tesoura visto de trás, em três quartos' },
    ...SOCIAL,
  },
  // A mesma foto do hero: também é um trabalho do Instagram (sem bytes extras).
  {
    photo: photos.hero,
    title: 'Degradê',
    caption: 'Arraste ao lado para ver o antes, mudança boa, hein?!',
    date: '2026-10-23',
    post: 'https://www.instagram.com/p/De1lASVkaRk/',
  },
];

export function workTitle(work: Work, index: number): string {
  return work.title ?? `Trabalho ${String(index + 1).padStart(2, '0')}`;
}

const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "2026-09-19" → "setembro de 2026" (em UTC: o mesmo resultado no build e no navegador). */
export function monthYear(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return monthFormat.format(Date.UTC(year, month - 1, day));
}

// ── Textos ─────────────────────────────────────────────────────────────────
// Na voz da própria barbearia: "só chegar e cortar!", "bora?!", "alinhou o
// visual", "barba e cabelo" saem das legendas e do emblema. Sem história,
// tempo de carreira ou formação (não estão publicados).

export const copy = {
  eyebrow: 'Barbearia Brandt',
  tagline: 'Barba e cabelo',
  phrase: 'Só chegar e cortar.',
  intro: 'Degradê, social na tesoura e barba no Alto Benedito, em Benedito Novo (SC).',
  /** Entre *asteriscos*: palavras em itálico. */
  manifesto:
    'Visual *alinhado* não é sorte. É degradê na zero, social todo na *tesoura* e barba no ponto — no Alto Benedito, é só *chegar*.',
  about: {
    title: ['Barba e cabelo.', 'No Alto Benedito.'],
    paragraphs: [
      'A Barbearia Brandt fica na Rua Leopoldo Koprowski, 1488, no Alto Benedito Novo, em frente ao posto Zummcar. Paredes claras, cadeiras pretas e uma bancada de madeira com tudo à mão: máquina, tesouras, pentes e navalha.',
      'No Instagram ficam os resultados — degradês, sociais na tesoura e muitos antes e depois. Para marcar, é só mandar uma mensagem. Ou chegar.',
    ],
  },
  transformations: {
    title: ['Antes', 'e depois.'],
    hint: 'Arraste para ver o antes.',
  },
  booking: {
    title: ['Bora', 'alinhar o visual?'],
  },
} as const;

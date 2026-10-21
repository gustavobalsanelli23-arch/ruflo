// Fonte única das informações do Studio Sene Hair.
// Tudo aqui foi conferido no Instagram oficial (@studiosenehair_baruerisp) em
// out/2026 — legendas, artes e fotos das publicações. Nada foi inventado:
// campos `null` não estavam disponíveis e ficam prontos para preenchimento.
import manifest from './images.json';

export const business = {
  name: 'Studio Sene Hair',
  shortName: 'Studio Sene',
  /** Assinatura usada nas artes do próprio estúdio. */
  tagline: 'Saúde · Beleza · Autoestima',
  city: 'Barueri',
  state: 'SP',
} as const;

export const links = {
  instagram: 'https://www.instagram.com/studiosenehair_baruerisp/',
  instagramHandle: '@studiosenehair_baruerisp',
} as const;

/** WhatsApp divulgado na publicação de Outubro Rosa (instagram.com/p/DeH3KbkNQvE). */
export const whatsapp = {
  number: '5511959566097',
  display: '(11) 95956-6097',
} as const;

export const messages = {
  default: 'Olá, Studio Sene! Vi o site e gostaria de agendar um horário. Pode me ajudar?',
  results:
    'Olá, Studio Sene! Vi os resultados no site e quero cuidar do meu cabelo também. Qual tratamento você indica para mim?',
  location: 'Olá, Studio Sene! Poderia me enviar o endereço do estúdio e os horários de atendimento?',
  service: (name: string) =>
    `Olá, Studio Sene! Tenho interesse em ${name} e gostaria de saber mais e agendar um horário.`,
} as const;

export function whatsappLink(message: string = messages.default) {
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(message)}`;
}

/**
 * Endereço do estúdio — PREENCHER. As publicações citam apenas
 * "Studio Sene – Barueri" e a localização "Barueri Zona Oeste SP".
 * Com `street` preenchido, o site passa a exibir o mapa e o botão de rota.
 */
export const address: {
  street: string | null; // ex.: 'Rua Exemplo, 123'
  complement: string | null; // ex.: 'Sala 4'
  district: string | null; // ex.: 'Centro'
  postalCode: string | null; // ex.: '06400-000'
  city: string;
  state: string;
} = {
  street: null,
  complement: null,
  district: null,
  postalCode: null,
  city: business.city,
  state: business.state,
};

/**
 * Horários de atendimento — PREENCHER, ex.:
 * [{ days: 'Terça a sábado', time: '9h às 19h', schema: 'Tu-Sa 09:00-19:00' }]
 * (`schema` é opcional, no formato schema.org, e alimenta o Google).
 */
export const hours: { days: string; time: string; schema?: string }[] | null = null;

export const hasAddress = address.street !== null;

export function fullAddress() {
  return [
    [address.street, address.complement].filter(Boolean).join(', '),
    address.district,
    `${address.city} – ${address.state}`,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(' · ');
}

const mapsQuery = () => `${business.name}, ${fullAddress()}`;
export const mapsEmbedUrl = () => `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery())}&output=embed`;
export const mapsRouteUrl = () =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery())}`;

// ---------------------------------------------------------------------------
// Imagens
// ---------------------------------------------------------------------------

type ManifestEntry = { width: number; height: number; widths: number[]; avif?: boolean };
const images = manifest as Record<string, ManifestEntry>;

export type ImageSet = ManifestEntry & { name: string; alt: string };

export function img(name: keyof typeof manifest & string, alt: string): ImageSet {
  const entry = images[name];
  if (!entry) throw new Error(`Imagem não encontrada no manifesto: ${name}`);
  return { name, alt, ...entry };
}

export const heroImages = {
  main: img(
    'hero-botox-dourado',
    'Cabelo longo castanho-dourado, liso e brilhante, após botox capilar no Studio Sene Hair',
  ),
  detail: img('detalhe-fios-brilho', 'Detalhe de mecha escura alinhada e com brilho, presa em um nó'),
};

// ---------------------------------------------------------------------------
// Serviços — somente os identificados nas publicações. Descrições baseadas na
// arte "Entenda a diferença" (instagram.com/p/Dc45h5jtC2F) e nas legendas.
// ---------------------------------------------------------------------------

export type Service = {
  id: string;
  name: string;
  kicker: string;
  description: string;
  indication: string | null;
  image: ImageSet;
};

export const services: Service[] = [
  {
    id: 'botox-capilar',
    name: 'Botox capilar',
    kicker: 'O queridinho do estúdio',
    description:
      'Repõe massa, vitaminas e nutrientes. Devolve brilho e maciez, alinha os fios, reduz o frizz e ajuda na durabilidade da progressiva.',
    indication: 'Todos os tipos de cabelo, principalmente danificados, ressecados e sem vida.',
    image: img('botox-castanho-claro', 'Cabelo castanho longo, alinhado e brilhante após botox capilar'),
  },
  {
    id: 'progressiva-sem-formol',
    name: 'Progressiva sem formol',
    kicker: 'Brilho espelhado',
    description:
      'Alisamento duradouro que reduz volume e frizz, com fios alinhados e efeito espelhado — inclusive em cabelos crespos, respeitando a estrutura de cada fio.',
    indication: 'Cabelos com muito volume, cacheados ou crespos que desejam um liso intenso ou mais praticidade.',
    image: img(
      'progressiva-sem-formol-escuro',
      'Cabelo escuro, liso e com brilho espelhado após progressiva sem formol',
    ),
  },
  {
    id: 'selagem',
    name: 'Selagem',
    kicker: 'Alinhamento e controle',
    description:
      'Sela as cutículas dos fios com ativos condicionantes: reduz o volume, controla o frizz e deixa o cabelo mais alinhado e com brilho.',
    indication: 'Cabelos com frizz, volume e fios rebeldes que desejam mais alinhamento.',
    image: img('botox-escuro-alinhado', 'Cabelo escuro, liso, alinhado e com brilho'),
  },
  {
    id: 'cauterizacao',
    name: 'Cauterização',
    kicker: 'Cauter Gloss',
    description:
      'Ajuda a repor proteínas e fortalecer a fibra capilar, deixando os fios mais resistentes, alinhados, macios e com brilho.',
    indication: 'Cabelos ressecados, quebradiços ou que passaram por química, coloração ou descoloração.',
    image: img('cauter-gloss', 'Cabelo escuro na altura dos ombros, alinhado e brilhante após cauterização'),
  },
  {
    id: 'hidratacao',
    name: 'Hidratação',
    kicker: 'Saúde dos fios',
    description:
      'Para fios mais saudáveis, brilhantes e cheios de vida — com direito a massagem relaxante no lavatório.',
    indication: null,
    image: img(
      'lavatorio-cuidado',
      'Profissional aplicando produto nas mãos para tratar o cabelo de uma cliente no lavatório',
    ),
  },
  {
    id: 'corte',
    name: 'Corte',
    kicker: 'Do Chanel ao infantil',
    description:
      'O acabamento que valoriza o tratamento: do Chanel que realça o rosto ao corte das pequenas, com o mesmo cuidado.',
    indication: null,
    image: img('botox-chanel', 'Cabelo acobreado em corte Chanel, liso e brilhante'),
  },
  {
    id: 'escova-babyliss',
    name: 'Escova e babyliss',
    kicker: 'Finalização',
    description: 'Higienização, escova e babyliss para ondas com movimento e acabamento de salão.',
    indication: null,
    image: img('escova-babyliss', 'Cabelo longo com mechas caramelo e ondas feitas no babyliss'),
  },
  {
    id: 'tranca-nago',
    name: 'Trança nagô',
    kicker: 'Boxeadora e freestyle',
    description: 'Tranças rentes ao couro cabeludo, com divisões precisas e acabamento delicado.',
    indication: null,
    image: img('tranca-nago-boxeadora', 'Cliente com trança nagô boxeadora, vista de perfil'),
  },
];

/** Campanha publicada em instagram.com/p/DeH3KbkNQvE — exibida só até o fim de outubro/2026. */
export const promo = {
  title: 'Outubro Rosa no Studio Sene',
  body: 'Ao realizar Botox Capilar ou Progressiva, você ganha uma Hidratação Especial de cortesia — para deixar seus fios ainda mais saudáveis, brilhantes e cheios de vida.',
  note: 'Promoção válida durante todo o mês de outubro.',
  /** Fim da validade: virada de 31/10 para 01/11/2026, horário de Brasília. */
  validUntil: Date.parse('2026-11-01T00:00:00-03:00'),
  message:
    'Olá, Studio Sene! Vi a campanha de Outubro Rosa no site e gostaria de agendar Botox Capilar ou Progressiva com a hidratação de cortesia.',
} as const;

// ---------------------------------------------------------------------------
// Galeria — resultados reais publicados no Instagram.
// ---------------------------------------------------------------------------

export type GalleryItem = ImageSet & {
  caption: string;
  date: string;
  post: string;
  /** Proporção do quadro na grade editorial. */
  shape: 'tall' | 'portrait' | 'square';
};

const post = (code: string) => `https://www.instagram.com/p/${code}/`;

export const gallery: GalleryItem[] = [
  {
    ...img('botox-chanel-perfil', 'Cabelo acobreado em corte Chanel, liso e brilhante, visto de lado'),
    caption: 'Botox capilar e Chanel',
    date: 'Ago 2026',
    post: post('DcOM6xBDqnO'),
    shape: 'tall',
  },
  {
    ...img('tranca-nago-boxeadora-lateral', 'Trança nagô boxeadora com acessório prateado, vista de perfil'),
    caption: 'Trança nagô boxeadora',
    date: 'Mai 2025',
    post: post('DJX1AQjSPE-'),
    shape: 'square',
  },
  {
    ...img('progressiva-corte-perfil', 'Cliente de perfil com cabelo liso e brilhante após progressiva e corte'),
    caption: 'Progressiva e corte',
    date: 'Set 2026',
    post: post('DdfBRklncy7'),
    shape: 'portrait',
  },
  {
    ...img('botox-escuro-longo', 'Cabelo escuro e muito longo, alinhado e com brilho após botox capilar'),
    caption: 'Botox capilar',
    date: 'Ago 2026',
    post: post('Dci7E0Ljq6M'),
    shape: 'portrait',
  },
  {
    ...img('escova-babyliss-retrato', 'Cliente sorrindo com cabelo loiro escuro em ondas feitas com escova e babyliss'),
    caption: 'Escova e babyliss',
    date: 'Out 2025',
    post: post('DPkRZK4EYc_'),
    shape: 'tall',
  },
  {
    ...img('tranca-nago-freestyle', 'Trança nagô freestyle com coque e acessórios dourados'),
    caption: 'Trança nagô freestyle',
    date: 'Mai 2025',
    post: post('DJHY0YiuyIJ'),
    shape: 'portrait',
  },
  {
    ...img('hidratacao-corte-infantil', 'Cabelo longo e brilhante de uma cliente infantil após hidratação e corte'),
    caption: 'Hidratação e corte infantil',
    date: 'Set 2026',
    post: post('DdNfCJsDaZh'),
    shape: 'portrait',
  },
  {
    ...img('botox-resultado-2025', 'Cabelo castanho na altura dos ombros, liso e brilhante após botox capilar'),
    caption: 'Botox capilar',
    date: 'Mai 2025',
    post: post('DJ-apD2SowM'),
    shape: 'square',
  },
];

/** Comparações antes/depois — fotos e quadros das mesmas publicações. */
export const beforeAfter = [
  {
    id: 'botox',
    label: 'Botox capilar',
    before: img('botox-antes', 'Antes: cabelo escuro ondulado, com frizz e sem alinhamento'),
    after: img('botox-depois', 'Depois: cabelo escuro alinhado e brilhante após botox capilar'),
    post: post('DdNWN9GDXdj'),
  },
  {
    id: 'crespo',
    label: 'Progressiva em cabelo crespo',
    before: img('progressiva-crespo-antes', 'Antes: cabelo crespo, volumoso e com pontas ressecadas'),
    after: img('progressiva-crespo-depois', 'Depois: cabelo liso, alinhado e com brilho após progressiva sem formol'),
    post: post('DcTXfU0jiWO'),
  },
  {
    id: 'progressiva-corte',
    label: 'Progressiva e corte',
    before: img('progressiva-corte-antes', 'Antes: cabelo castanho longo, armado e com frizz'),
    after: img('progressiva-corte-resultado', 'Depois: cabelo castanho liso e brilhante, com novo corte'),
    post: post('DdfBRklncy7'),
  },
  {
    id: 'progressiva',
    label: 'Progressiva sem formol',
    before: img('progressiva-sem-formol-antes', 'Antes: cabelo escuro volumoso, com frizz'),
    after: img('progressiva-sem-formol-depois', 'Depois: cabelo escuro liso com brilho espelhado'),
    post: post('DeeXZH2hi-e'),
  },
] as const;

// ---------------------------------------------------------------------------
// Experiência
// ---------------------------------------------------------------------------

export const experienceSteps = [
  {
    title: 'Escuta e avaliação',
    text: 'Antes de tudo, entender o seu cabelo e o resultado que você imagina — para escolher o procedimento de acordo com a necessidade de cada fio.',
  },
  {
    title: 'Lavatório com massagem',
    text: 'O ritual começa no lavatório, com uma massagem que transforma a lavagem em um momento de pausa.',
  },
  {
    title: 'Técnica e atenção',
    text: 'Cada procedimento é aplicado com cuidado, mecha a mecha, para um resultado personalizado.',
  },
  {
    title: 'Brilho na finalização',
    text: 'Fios alinhados, macios e com aquele brilho que dá vontade de ficar passando a mão no cabelo o tempo todo.',
  },
] as const;

export const experienceMedia = {
  video: {
    webm: '/media/brilho-em-movimento.webm',
    mp4: '/media/brilho-em-movimento.mp4',
    poster: '/media/brilho-em-movimento.webp',
    ...images['video:brilho-em-movimento'],
  },
  wash: img(
    'lavatorio-massagem',
    'Profissional massageando o couro cabeludo de uma cliente durante a lavagem no lavatório',
  ),
};

/** O encerramento retoma a foto do herói, como num editorial que abre e fecha com a mesma imagem. */
export const finalCtaImage = heroImages.main;

export const navItems = [
  { id: 'filosofia', label: 'Filosofia' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'resultados', label: 'Resultados' },
  { id: 'experiencia', label: 'Experiência' },
  { id: 'contato', label: 'Contato' },
] as const;
